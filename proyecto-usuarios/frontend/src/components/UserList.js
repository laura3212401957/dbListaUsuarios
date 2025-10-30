import React, { useEffect, useState } from 'react';
import axios from 'axios';

function UserList() {
    const [users, setUsers] = useState([]);
    useEffect(() => {
        axios.get('http://localhost:5001/api/usuarios')
            .then(res => setUsers(res.data))
            .catch(err => console.error(err));
    }, []);
    return (
        <div style={{ padding: "20px" }}>
            <h2>User List</h2>
            <table border="1" cellPadding="10">
                <thead>
                    <tr>
                        <th>ID</th><th>Name</th><th>Email</th>
                    </tr>
                </thead>
                <tbody>
                    {users.map(u => (
                        <tr key={u.id}>
                            <td>{u.id}</td>
                            <td>{u.nombre}</td>
                            <td>{u.email}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
export default UserList;