const express = require('express');
const router = express.Router();
const db = require('../config/database');
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
module.exports = router;