const express = require('express');
const router = express.Router();
const db = require('../config/database');
const auth = require('../middleware/auth');


//query consulta a todos los usuarios
router.get('/', (req, res) => {
    const query = 'SELECT * FROM usuarios ORDER BY id DESC';
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
// Crear (POST) - protegido
router.post('/', auth, (req, res) => {
  const { nombre, email, telefono } = req.body;
  if (!nombre || !email) return res.status(400).json({ error: 'Nombre y correo son requeridos' });

  const query = 'INSERT INTO usuarios (nombre, email, telefono) VALUES (?, ?, ?)';
  db.query(query, [nombre, email, telefono], (err, result) => {
    if (err) {
      if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Email ya existe' });
      return res.status(500).json({ error: 'Error al crear usuario', details: err.message });
    }
    res.json({ id: result.insertId, nombre, email, telefono });
  });
});

// Actualizar (PUT) - protegido
router.put('/:id', auth, (req, res) => {
  const { id } = req.params;
  const { nombre, email, telefono } = req.body;
  const query = 'UPDATE usuarios SET nombre = ?, email = ?, telefono = ? WHERE id = ?';
  db.query(query, [nombre, email, telefono, id], (err, result) => {
    if (err) return res.status(500).json({ error: 'Error al actualizar', details: err.message });
    res.json({ message: 'Usuario actualizado correctamente' });
  });
});

// Eliminar (DELETE) - protegido
router.delete('/:id', auth, (req, res) => {
  const { id } = req.params;
  const query = 'DELETE FROM usuarios WHERE id = ?';
  db.query(query, [id], (err, result) => {
    if (err) return res.status(500).json({ error: 'Error al eliminar', details: err.message });
    res.json({ message: 'Usuario eliminado correctamente' });
  });
});
module.exports = router;