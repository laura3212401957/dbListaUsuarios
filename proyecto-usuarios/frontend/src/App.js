import React, { useState } from "react";
import Login from "./components/Login";
import Register from "./components/Register";
import UserList from "./components/UserList";
import "./style.css";

function App() {
  const [user, setUser] = useState(
    localStorage.getItem("token")
      ? JSON.parse(atob(localStorage.getItem("token").split(".")[1]))
      : null
  );
  const [showRegister, setShowRegister] = useState(false);

  return (
    <div className="app-container">
      {!user ? (
        showRegister ? (
          <>
            <Register onRegister={() => setShowRegister(false)} />
                <p className="text-center">
              ¿Ya tienes cuenta?{" "}
                 <button className="secondary-btn" onClick={() => setShowRegister(false)}>Inicia sesión</button>
            </p>
          </>
        ) : (
          <>
            <Login onLogin={setUser} />
                <p className="text-center">
              ¿No tienes cuenta?{" "}
                 <button className="secondary-btn" onClick={() => setShowRegister(true)}>Regístrate</button>
            </p>
          </>
        )
      ) : (
        <UserList user={user} onLogout={() => setUser(null)} />
      )}
    </div>
  );
}

export default App;
