import React, { useState } from 'react';
import api from '../api';

function Register({ onRegister }) {
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    password: '',
    confirmPassword: '',
    telefono: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (formData.password.length < 5) {
      setError('La contraseña debe tener al menos 5 caracteres');
      return;
    }

    // Validación básica de teléfono (opcional)
    if (formData.telefono) {
      const phone = formData.telefono.replace(/\s|\-|\(|\)/g, '');
      if (!/^\d{7,15}$/.test(phone)) {
        setError('Teléfono inválido: debe contener entre 7 y 15 dígitos');
        return;
      }
    }

    setLoading(true);

    try {
      const { confirmPassword, ...dataToSend } = formData;
      await api.post('/auth/register', dataToSend);
      
      setSuccess(true);
      setTimeout(() => {
        onRegister();
      }, 1500);
    } catch (err) {
      // Mejor detalle de logging para diagnosticar errores de red/404
      console.error('Error en registro:', err);
      if (err.response) {
        console.error('Response data:', err.response.data);
        console.error('Response status:', err.response.status);
      } else {
        console.error('No response (network error):', err.message);
      }

      const serverMessage = err.response?.data?.error || err.response?.data?.message;
      setError(
        serverMessage || `Error al registrar usuario. ${err.response ? 'Revisa el servidor.' : err.message}`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-container">
      <h2>Crear cuenta</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          name="nombre"
          placeholder="Nombre completo"
          value={formData.nombre}
          onChange={handleChange}
          required
          disabled={loading}
        />
        <input
          type="email"
          name="email"
          placeholder="Correo electrónico"
          value={formData.email}
          onChange={handleChange}
          required
          disabled={loading}
        />
        <input
          type="text"
          name="telefono"
          placeholder="Teléfono"
          value={formData.telefono}
          onChange={handleChange}
          disabled={loading}
        />
        <input
          type="password"
          name="password"
          placeholder="Contraseña"
          value={formData.password}
          onChange={handleChange}
          required
          disabled={loading}
        />
        <input
          type="password"
          name="confirmPassword"
          placeholder="Confirmar contraseña"
          value={formData.confirmPassword}
          onChange={handleChange}
          required
          disabled={loading}
        />
        <button 
          type="submit" 
          disabled={loading}
        >
          {loading ? 'Registrando...' : 'Registrarse'}
        </button>
      </form>
      {error && <p className="error">{error}</p>}
      {success && <p className="success">¡Registro exitoso! Redirigiendo...</p>}
    </div>
  );
}

export default Register;