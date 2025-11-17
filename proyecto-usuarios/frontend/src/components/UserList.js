import React, { useEffect, useState } from 'react';
import api from '../api'; // instancia configurada con token

function UserList({ user, onLogout }) {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    // Ruta interna simple: 'list' | 'profile' | 'settings' | 'admin'
    const [route, setRoute] = useState('list');

    // Edición/creación
    const [editingUser, setEditingUser] = useState(null);
    const [form, setForm] = useState({ nombre: '', email: '', telefono: '', password: '' });

    useEffect(() => {
        if (route === 'list' || route === 'admin') fetchUsers();
    }, [route]);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            setError('');
            // Sólo los administradores pueden obtener la lista completa en el backend
            const res = await api.get('/usuarios');
            setUsers(res.data);
        } catch (err) {
            console.error('Error al cargar usuarios:', err);
            if (err.response && err.response.status === 403) {
                setError('No autorizado. Necesitas permisos de administrador para ver la lista.');
            } else {
                setError('Error al cargar la lista de usuarios');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleNavigate = (r) => setRoute(r);

    // CRUD admin
    const startCreate = () => {
        setEditingUser(null);
        setForm({ nombre: '', email: '', telefono: '', password: '' });
        setRoute('admin');
    };

    const startEdit = (u) => {
        setEditingUser(u);
        // al editar no rellenamos la contraseña (solo se usa al crear)
        setForm({ nombre: u.nombre || '', email: u.email || '', telefono: u.telefono || '', password: '' });
        setRoute('admin');
    };

    const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

    const handleSave = async () => {
        try {
            setLoading(true);
            // Validación básica de teléfono
            if (form.telefono) {
                const phone = form.telefono.replace(/\s|\-|\(|\)/g, '');
                if (!/^\d{7,15}$/.test(phone)) {
                    setError('Teléfono inválido: debe contener entre 7 y 15 dígitos');
                    setLoading(false);
                    return;
                }
            }
            if (editingUser) {
                await api.put(`/usuarios/${editingUser.id}`, form);
            } else {
                await api.post('/usuarios', form);
            }
            await fetchUsers();
            setRoute('list');
        } catch (err) {
            console.error('Error al guardar usuario:', err);
            if (err.response) setError(err.response.data?.error || 'Error en servidor');
            else setError('Error al guardar usuario');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('¿Eliminar usuario? esta acción no se puede deshacer.')) return;
        try {
            setLoading(true);
            await api.delete(`/usuarios/${id}`);
            await fetchUsers();
        } catch (err) {
            console.error('Error al eliminar usuario:', err);
            if (err.response) setError(err.response.data?.error || 'Error en servidor');
            else setError('Error al eliminar usuario');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="userlist-container">
            <div className="header">
                <div>
                    <h2>Usuarios</h2>
                    {user && (
                        <p style={{ margin: '5px 0', color: '#666' }}>
                            Bienvenido, <strong>{user.nombre || user.email}</strong>
                            {user.rol && <span style={{ marginLeft: 8 }}>({user.rol})</span>}
                        </p>
                    )}
                </div>

                <div className="flex align-center gap-10">
                    <button onClick={() => handleNavigate('list')} className="secondary-btn">Usuarios</button>
                    <button onClick={() => handleNavigate('profile')} className="secondary-btn">Perfil</button>
                    <button onClick={() => handleNavigate('settings')} className="secondary-btn">Ajustes</button>

                    {user?.rol === 'admin' && (
                        <>
                            <button onClick={startCreate} className="success-btn">Crear Usuario</button>
                        </>
                    )}

                    <button onClick={onLogout} className="logout-btn">Cerrar Sesión</button>
                </div>
            </div>

            <div style={{ marginTop: '16px' }}>
                {route === 'list' && (
                    <>
                        {loading ? (
                            <p>Cargando usuarios...</p>
                        ) : error ? (
                            <div>
                                <p className="error">{error}</p>
                                <button onClick={fetchUsers}>Reintentar</button>
                            </div>
                        ) : users.length === 0 ? (
                            <p>No hay usuarios registrados</p>
                        ) : (
                            <table>
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Nombre</th>
                                        <th>Email</th>
                                        <th>Teléfono</th>
                                        <th>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map(u => (
                                        <tr key={u.id}>
                                            <td>{u.id}</td>
                                            <td>{u.nombre}</td>
                                            <td>{u.email}</td>
                                            <td>{u.telefono || '-'}</td>
                                            <td>
                                                {user?.rol === 'admin' ? (
                                                    <>
                                                        <button onClick={() => startEdit(u)} style={{ marginRight: 8 }}>Editar</button>
                                                        <button onClick={() => handleDelete(u.id)} style={{ backgroundColor: '#dc3545', color: 'white' }}>Eliminar</button>
                                                    </>
                                                ) : (
                                                    <em>Sin permisos</em>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </>
                )}

                {route === 'profile' && (
                    <div className="profile">
                        <h3>Mi perfil</h3>
                        <p><strong>Nombre:</strong> {user?.nombre || '-'}</p>
                        <p><strong>Email:</strong> {user?.email || '-'}</p>
                        <p><strong>ID:</strong> {user?.id || '-'}</p>
                    </div>
                )}

                {route === 'settings' && (
                    <div className="settings">
                        <h3>Ajustes</h3>
                        <p>Aquí puedes añadir opciones de configuración de la cuenta.</p>
                        <button onClick={() => alert('Guardado (placeholder)')}>Guardar ajustes</button>
                    </div>
                )}

                {route === 'admin' && (
                    <div>
                            <div className="card form-width">
                            <label>Nombre</label>
                            <input name="nombre" value={form.nombre} onChange={handleChange} />

                            <label>Email</label>
                            <input name="email" value={form.email} onChange={handleChange} />

                            <label>Teléfono</label>
                            <input name="telefono" value={form.telefono} onChange={handleChange} />

                            {/* Sólo para creación: pedir contraseña */}
                            {!editingUser && (
                                <>
                                    <label>Contraseña</label>
                                    <input type="password" name="password" value={form.password} onChange={handleChange} />
                                </>
                            )}

                            <div className="flex gap-10">
                                <button onClick={handleSave}>{editingUser ? 'Actualizar' : 'Crear'}</button>
                                <button className="secondary-btn" onClick={() => { setRoute('list'); setEditingUser(null); }}>Cancelar</button>
                            </div>

                            {error && <p className="error">{error}</p>}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default UserList;