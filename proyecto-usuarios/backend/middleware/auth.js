const jwt = require('jsonwebtoken'); //libreria que maneja los tokens
const dotenv = require('dotenv'); //permite usar las variables guardadas en el archivo .env (como la clave secreta)
dotenv.config();

module.exports = function (req, res, next) { //peticion, repuesta y next
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Token requerido' });

  const token = authHeader.split(' ')[1]; 
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET); //verifica el token
    req.user = payload; // { id, email, rol }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido' });
  }
};