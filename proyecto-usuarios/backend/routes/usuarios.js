const express = require('express');
const router = express.Router();
const db = require('../config/database');
const auth = require('../middleware/auth');
const bcrypt = require('bcrypt');

// Helper: verificar si el usuario autenticado es admin
function isAdmin(req) {
  return req.user && (req.user.rol === 'admin' || req.user.role === 'admin');
}

// 📋 Obtener todos los usuarios (autenticados pueden ver la tabla)
router.get('/', auth, (req, res) => {
  const query = 'SELECT * FROM usuarios ORDER BY fecha_registro DESC';
  db.query(query, (err, results) => {
    if (err) {
      console.error('Error al obtener usuarios:', err);
      return res.status(500).json({
        error: 'Error al obtener usuarios',
        details: err.message
      });
    }
    res.json(results);
  });
});

// 🔍 Obtener usuario por ID (admin o propietario)
router.get('/:id', auth, (req, res) => {
  const { id } = req.params;

  // permitir al propio usuario ver su perfil, o al admin ver cualquier perfil
  if (!isAdmin(req) && Number(req.user?.id) !== Number(id))
    return res.status(403).json({ error: 'No autorizado' });

  const query = 'SELECT * FROM usuarios WHERE id = ?';
  db.query(query, [id], (err, results) => {
    if (err) {
      console.error('Error al buscar usuario por ID:', err);
      return res.status(500).json({
        error: 'Error al buscar usuario',
        details: err.message
      });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json(results[0]);
  });
});

// ➕ Crear usuario (solo admin) — crea cuenta con contraseña y perfil
router.post('/', auth, (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'No autorizado' });

  const { nombre, email, telefono, password, rol } = req.body;
  if (!nombre || !email || !password)
    return res.status(400).json({ error: 'Nombre, correo y contraseña son requeridos' });

  // comprobar si el email ya existe en cuentas
  const checkQuery = 'SELECT * FROM cuentas WHERE email = ?';
  db.query(checkQuery, [email], async (checkErr, checkRes) => {
    if (checkErr) {
      console.error('Error comprobando cuentas:', checkErr);
      return res.status(500).json({ error: 'Error en el servidor', details: checkErr.message });
    }
    if (checkRes && checkRes.length > 0) return res.status(409).json({ error: 'El correo ya está registrado' });

    try {
      const hash = await bcrypt.hash(password, 10);

      db.beginTransaction((txErr) => {
        if (txErr) {
          console.error('Error iniciando transacción:', txErr);
          return res.status(500).json({ error: 'Error al crear usuario', details: txErr.message });
        }

        const insertCuenta = 'INSERT INTO cuentas (nombre, email, password, rol) VALUES (?, ?, ?, ?)';
        db.query(insertCuenta, [nombre, email, hash, rol || 'usuario'], (insErr, insRes) => {
          if (insErr) {
            db.rollback(() => {});
            console.error('Error insertando cuenta:', insErr);
            return res.status(500).json({ error: 'Error al crear cuenta', details: insErr.message });
          }

          const cuentaId = insRes.insertId;

          // Intentar insertar perfil en usuarios preferentemente con cuenta_id
          const checkCol = `SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'usuarios' AND COLUMN_NAME = 'cuenta_id'`;
          db.query(checkCol, [process.env.DB_NAME], (colErr, colRes) => {
            if (colErr) {
              db.rollback(() => {});
              console.error('Error comprobando esquema usuarios:', colErr);
              return res.status(500).json({ error: 'Error al crear perfil de usuario', details: colErr.message });
            }

            const hasCuentaId = (colRes[0] && colRes[0].cnt > 0);
            const insertUsuarioQuery = hasCuentaId
              ? 'INSERT INTO usuarios (cuenta_id, nombre, email, telefono) VALUES (?, ?, ?, ?)'
              : 'INSERT INTO usuarios (nombre, email, telefono) VALUES (?, ?, ?)';

            const params = hasCuentaId ? [cuentaId, nombre, email, telefono] : [nombre, email, telefono];
            db.query(insertUsuarioQuery, params, (uErr) => {
              if (uErr) {
                db.rollback(() => {});
                console.error('Error insertando perfil usuario:', uErr);
                return res.status(500).json({ error: 'Error al crear perfil de usuario', details: uErr.message });
              }

              db.commit((cErr) => {
                if (cErr) {
                  db.rollback(() => {});
                  console.error('Error en commit tras crear usuario:', cErr);
                  return res.status(500).json({ error: 'Error al crear cuenta', details: cErr.message });
                }
                return res.json({ message: 'Usuario creado correctamente', id: cuentaId, nombre, email, telefono });
              });
            });
          });
        });
      });
    } catch (e) {
      console.error('Error hashing o creando usuario:', e);
      return res.status(500).json({ error: 'Error interno del servidor' });
    }
  });
});

// Actualizar usuario (solo admin)
router.put('/:id', auth, (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'No autorizado' });

  const { id } = req.params;
  const { nombre, email, telefono } = req.body;

  const query = 'UPDATE usuarios SET nombre = ?, email = ?, telefono = ? WHERE id = ?';
  db.query(query, [nombre, email, telefono, id], (err) => {
    if (err)
      return res.status(500).json({ error: 'Error al actualizar usuario', details: err.message });
    res.json({ message: 'Usuario actualizado correctamente' });
  });
});

// Eliminar usuario (solo admin)
router.delete('/:id', auth, (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'No autorizado' });

  const { id } = req.params;
  const query = 'DELETE FROM usuarios WHERE id = ?';
  db.query(query, [id], (err) => {
    if (err)
      return res.status(500).json({ error: 'Error al eliminar usuario', details: err.message });
    res.json({ message: 'Usuario eliminado correctamente' });
  });
});

module.exports = router;
