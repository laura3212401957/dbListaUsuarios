import axios from "axios";

// Configurar instancia principal de Axios
const api = axios.create({
  baseURL: "http://localhost:5001/api", 
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor de solicitud: adjunta token JWT automáticamente
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error("Error configurando la petición:", error);
    return Promise.reject(error);
  }
);

// Interceptor de respuesta: maneja errores globales (401, 403, etc.)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const status = error.response.status;

      // Si el token es inválido o expiró
      if (status === 401) {
        console.warn("⚠️ Token inválido o expirado. Cerrando sesión...");
        localStorage.removeItem("token");
        window.location.href = "/"; // Redirige al login
      }

      // Si el usuario no tiene permisos
      if (status === 403) {
        alert("No tienes permisos para realizar esta acción.");
      }

      //Errores del servidor
      if (status >= 500) {
        console.error("Error interno del servidor:", error.response.data);
      }
    } else {
      console.error("Error de red o servidor no disponible:", error.message);
    }

    return Promise.reject(error);
  }
);

export default api;
