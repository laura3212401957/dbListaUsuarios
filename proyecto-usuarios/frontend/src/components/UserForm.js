import React, { useState, useEffect } from "react";
import api from "../api";

function UserForm({ userToEdit, onSave }) {
  const [form, setForm] = useState({
    nombre: "",
    email: "",
    telefono: "",
  });

  useEffect(() => {
    if (userToEdit) setForm({ ...userToEdit });
  }, [userToEdit]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (userToEdit) {
        await api.put(`/usuarios/${userToEdit.id}`, form);
      } else {
        await api.post("/usuarios", form);
      }
      onSave();
      setForm({ nombre: "", email: "", telefono: "" });
    } catch (err) {
      console.error(err);
      alert("Error al guardar el usuario");
    }
  };

  return (
    <div className="form-container">
      <h3>{userToEdit ? "Editar usuario" : "Crear usuario"}</h3>
      <form onSubmit={handleSubmit}>
        <input
          name="nombre"
          placeholder="Nombre"
          value={form.nombre}
          onChange={handleChange}
          required
        />
        <input
          name="email"
          placeholder="Correo"
          type="email"
          value={form.email}
          onChange={handleChange}
          required
        />
        <input
          name="telefono"
          placeholder="Teléfono"
          value={form.telefono}
          onChange={handleChange}
        />
        <button type="submit">
          {userToEdit ? "Actualizar" : "Registrar"}
        </button>
      </form>
    </div>
  );
}

export default UserForm;
