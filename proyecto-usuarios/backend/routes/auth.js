const express = require('express');
const router = express.Router();
const db = require('../config/database');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
dotenv.config();

// Helper: comprobar rol admin en payload del token
function isAdminPayload(payload) {
  return payload && (payload.rol === 'admin' || payload.role === 'admin');
}

//LOGIN
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Email y contraseña son requeridos' });

  const query = 'SELECT * FROM cuentas WHERE email = ? LIMIT 1';
  db.query(query, [email], async (err, results) => {
    if (err) return res.status(500).json({ error: 'Error en el servidor', details: err.message });
    if (!results.length) return res.status(401).json({ error: 'Credenciales incorrectas' });

    const user = results[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Credenciales incorrectas' });

    const payload = { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });

    res.json({ message: 'Login exitoso', token, user: payload });
  });
});

//REGISTRO DE CUENTAS NUEVAS
router.post('/register', async (req, res) => {
  const { nombre, email, password, rol, telefono } = req.body;
  if (!nombre || !email || !password)
    return res.status(400).json({ error: 'Nombre, email y contraseña son requeridos' });

  try {
    const checkQuery = 'SELECT * FROM cuentas WHERE email = ?';
    db.query(checkQuery, [email], async (err, results) => {
      if (results && results.length > 0)
        return res.status(409).json({ error: 'El correo ya está registrado' });

      const hash = await bcrypt.hash(password, 10);

      // Hacemos la inserción en una transacción para mantener consistencia
      db.beginTransaction((txErr) => {
        if (txErr) {
          console.error('Error iniciando transacción:', txErr);
          return res.status(500).json({ error: 'Error al crear cuenta', details: txErr.message });
        }

        const insertQuery = 'INSERT INTO cuentas (nombre, email, password, rol) VALUES (?, ?, ?, ?)';
        db.query(insertQuery, [nombre, email, hash, rol || 'usuario'], (err, result) => {
          if (err) {
            db.rollback(() => {});
            console.error('Error al insertar en cuentas:', err);
            return res.status(500).json({ error: 'Error al crear cuenta', details: err.message });
          }

          const cuentaId = result.insertId;

          // Intentamos insertar el perfil en la tabla `usuarios`. Hay distintos posibles:
          // 1) usuarios tiene columna `id` que coincide con cuentas.id -> INSERT con id explícito
          // 2) usuarios tiene columna `cuenta_id` -> INSERT usando cuenta_id
          // 3) usuarios no está relacionada -> INSERT sin id
          const tryInsertUsuarioWithId = () => {
            const insertUsuario = 'INSERT INTO usuarios (id, nombre, email, telefono) VALUES (?, ?, ?, ?)';
            db.query(insertUsuario, [cuentaId, nombre, email, telefono], (err2) => {
              if (!err2) {
                db.commit((cErr) => {
                  if (cErr) {
                    db.rollback(() => {});
                    console.error('Error en commit tras insertar usuario:', cErr);
                    return res.status(500).json({ error: 'Error al crear cuenta', details: cErr.message });
                  }
                  return res.json({ message: 'Cuenta registrada correctamente' });
                });
              } else {
                // si falla, intentamos otras opciones
                tryInsertUsuarioWithCuentaId();
              }
            });
          };

          const tryInsertUsuarioWithCuentaId = () => {
            // comprobar si existe la columna cuenta_id
            const checkCol = `SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'usuarios' AND COLUMN_NAME = 'cuenta_id'`;
            db.query(checkCol, [process.env.DB_NAME], (colErr, colRes) => {
              if (colErr) {
                db.rollback(() => {});
                console.error('Error comprobando esquema usuarios:', colErr);
                return res.status(500).json({ error: 'Error al crear perfil de usuario', details: colErr.message });
              }

              const hasCuentaId = (colRes[0] && colRes[0].cnt > 0);
                if (hasCuentaId) {
                const insertUsuario2 = 'INSERT INTO usuarios (cuenta_id, nombre, email, telefono) VALUES (?, ?, ?, ?)';
                db.query(insertUsuario2, [cuentaId, nombre, email, telefono], (err3) => {
                  if (!err3) {
                    db.commit((cErr) => {
                      if (cErr) {
                        db.rollback(() => {});
                        console.error('Error en commit tras insertar usuario (cuenta_id):', cErr);
                        return res.status(500).json({ error: 'Error al crear cuenta', details: cErr.message });
                      }
                      return res.json({ message: 'Cuenta registrada correctamente' });
                    });
                  } else {
                    // intento final: insertar sin id y sin cuenta_id
                    tryInsertUsuarioWithoutId();
                  }
                });
              } else {
                // no existe cuenta_id, intentamos insertar sin id
                tryInsertUsuarioWithoutId();
              }
            });
          };

          const tryInsertUsuarioWithoutId = () => {
            const insertUsuario3 = 'INSERT INTO usuarios (nombre, email, telefono) VALUES (?, ?, ?)';
            db.query(insertUsuario3, [nombre, email, telefono], (err4) => {
              if (!err4) {
                db.commit((cErr) => {
                  if (cErr) {
                    db.rollback(() => {});
                    console.error('Error en commit tras insertar usuario (sin id):', cErr);
                    return res.status(500).json({ error: 'Error al crear cuenta', details: cErr.message });
                  }
                  return res.json({ message: 'Cuenta registrada correctamente' });
                });
              } else {
                // todo falló -> rollback y devolver error
                db.rollback(() => {});
                console.error('Error al crear usuario en tabla usuarios (todos los intentos fallaron):', err4);
                return res.status(500).json({ error: 'Error al crear perfil de usuario', details: err4.message });
              }
            });
          };

          // Empezar la cadena de intentos
          tryInsertUsuarioWithId();
        });
      });
    });
  } catch (error) {
    console.error('Error al registrar cuenta:', error.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Cambiar contraseña (propio usuario) - requiere oldPassword y newPassword
router.put('/change-password', (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Token requerido' });
  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (!oldPassword || !newPassword) return res.status(400).json({ error: 'oldPassword y newPassword son requeridos' });

    const query = 'SELECT * FROM cuentas WHERE id = ? LIMIT 1';
    db.query(query, [payload.id], async (err, results) => {
      if (err) return res.status(500).json({ error: 'Error en servidor', details: err.message });
      if (!results.length) return res.status(404).json({ error: 'Cuenta no encontrada' });

      const user = results[0];
      const match = await bcrypt.compare(oldPassword, user.password);
      if (!match) return res.status(401).json({ error: 'Contraseña actual incorrecta' });

      const hash = await bcrypt.hash(newPassword, 10);
      const upd = 'UPDATE cuentas SET password = ? WHERE id = ?';
      db.query(upd, [hash, payload.id], (uErr) => {
        if (uErr) return res.status(500).json({ error: 'Error actualizando contraseña', details: uErr.message });
        res.json({ message: 'Contraseña actualizada correctamente' });
      });
    });
  } catch (e) {
    return res.status(401).json({ error: 'Token inválido' });
  }
});

// Cambiar contraseña como admin para otra cuenta (no requiere oldPassword)
router.put('/change-password/:id', (req, res) => {
  const { id } = req.params;
  const { newPassword } = req.body;
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Token requerido' });
  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (!isAdminPayload(payload)) return res.status(403).json({ error: 'No autorizado' });
    if (!newPassword) return res.status(400).json({ error: 'newPassword es requerido' });

    bcrypt.hash(newPassword, 10).then((hash) => {
      const upd = 'UPDATE cuentas SET password = ? WHERE id = ?';
      db.query(upd, [hash, id], (uErr) => {
        if (uErr) return res.status(500).json({ error: 'Error actualizando contraseña', details: uErr.message });
        res.json({ message: 'Contraseña actualizada por admin correctamente' });
      });
    }).catch((hErr) => {
      return res.status(500).json({ error: 'Error hasheando contraseña', details: hErr.message });
    });
  } catch (e) {
    return res.status(401).json({ error: 'Token inválido' });
  }
});

module.exports = router;

