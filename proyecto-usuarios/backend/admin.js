const db = require('./config/database');
const bcrypt = require('bcrypt'); //libreria que conecta contraseñas
//define los datos del administrador
const nombre = 'Admin';
const email = 'admin@email.com';
const password = '12345';
const rol = 'admin';


async function createAdmin() {
  const hash = await bcrypt.hash(password, 10); //genera una version encriptada de la contraseña
  const query = 'INSERT INTO cuentas (nombre, email, password, rol) VALUES (?, ?, ?, ?)';
  db.query(query, [nombre, email, hash, rol], (err, result) => {
    if (err) {
      console.error('Error creando admin:', err);
    } else {
      console.log('Admin creado con id:', result.insertId);
    }
    process.exit();
  });
}

createAdmin();