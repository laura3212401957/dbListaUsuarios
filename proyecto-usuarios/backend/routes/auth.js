const express = require('express');
const router = express.Router();
const db = require('../config/database');
const bcrypt = require('bcrypt'); //compara contraseñas encriptadas
const jwt = require('jsonwebtoken'); //genera y valida tokens
const dotenv = require('dotenv'); //carga la clave secreta
dotenv.config();

// se ejecuta cuando el front hace una solicitud POST (para crear)
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email y contraseña son requeridos' });

  const query = 'SELECT * FROM cuentas WHERE email = ? LIMIT 1';
  db.query(query, [email], async (err, results) => { //hace recorrido
    if (err) return res.status(500).json({ error: 'Error en el servidor', details: err.message });
    if (!results || results.length === 0) return res.status(401).json({ error: 'Credenciales incorrectas' });

    const user = results[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Credenciales incorrectas' });

    // Genera token
    const payload = { id: user.id, email: user.email, rol: user.rol, nombre: user.nombre };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });

    res.json({ message: 'Login exitoso', token, user: payload });
  });
});

module.exports = router;