import { createContext, useContext, useEffect, useState } from "react";
import API from "../api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  async function loadUser() {
    const token = localStorage.getItem("vd_token");
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const res = await API.get("/auth/me");
      setUser(res.data);
    } catch {
      localStorage.removeItem("vd_token");
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUser();
  }, []);

  function login(token, userData) {
    localStorage.setItem("vd_token", token);
    setUser(userData);
  }

  function logout() {
    localStorage.removeItem("vd_token");
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}