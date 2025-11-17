const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();

const usuariosRoutes = require('./routes/usuarios');
const authRoutes = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

// Logging simple de todas las peticiones para facilitar debugging
app.use((req, res, next) => {
  console.log(new Date().toISOString(), req.method, req.url);
  next();
});

// Rutas principales
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/auth', authRoutes);

console.log('Rutas montadas: /api/usuarios -> routes/usuarios, /api/auth -> routes/auth');

// Ruta base
app.get('/', (req, res) => {
  res.json({ message: 'API de Usuarios funcionando correctamente' });
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
