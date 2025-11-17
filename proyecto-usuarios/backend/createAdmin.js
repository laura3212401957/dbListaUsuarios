// backend/createAdmin.js
const db = require('./config/database');
const bcrypt = require('bcrypt');

const nombre = 'Administrador';
const email = 'admin@email.com';
const password = '12345';
const rol = 'admin';

async function createAdmin() {
  try {
    const hash = await bcrypt.hash(password, 10);

    db.query('SELECT * FROM cuentas WHERE email = ?', [email], (err, results) => {
      if (err) {
        console.error('Error verificando admin:', err);
        process.exit(1);
      }

      if (results.length > 0) {
        console.log('El administrador ya existe con ese correo.');
        process.exit(0);
      } else {
        db.query(
          'INSERT INTO cuentas (nombre, email, password, rol) VALUES (?, ?, ?, ?)',
          [nombre, email, hash, rol],
          (err, result) => {
            if (err) {
              console.error('Error creando admin:', err);
              process.exit(1);
            }
            console.log('Administrador creado correctamente');
            console.log('Email:', email);
            console.log('Password (texto plano):', password);
            process.exit(0);
          }
        );
      }
    });
  } catch (error) {
    console.error('Error al encriptar contraseña:', error);
    process.exit(1);
  }
}

createAdmin();
