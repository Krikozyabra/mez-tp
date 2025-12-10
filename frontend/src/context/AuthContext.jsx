import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [role, setRole] = useState('master');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState(null);

    useEffect(() => {
        const token = localStorage.getItem('accessToken');
        if (token) {
            setIsAuthenticated(true);
            // В идеале роль нужно брать из декодированного токена (jwt-decode)
            // или делать запрос на /users/me/
            // Пока оставим хардкод для примера, но лучше поправить
            setRole('technolog'); 
            setUser({ role: 'technolog', username: 'User' }); 
        }
    }, []);

    const hasPermission = (requiredRoles) => {
        if (!user) return false; 
        if (user.role === 'admin') return true;
        if (!user.role) return false;
        return requiredRoles.includes(user.role);
    };

    const login = async (username, password) => {
        try {
            // Убедитесь, что этот URL совпадает с вашим urls.py
            const response = await fetch('http://127.0.0.1:8000/api/v1/auth/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Ошибка авторизации');
            }

            const data = await response.json();

            localStorage.setItem('accessToken', data.access);
            localStorage.setItem('refreshToken', data.refresh);

            setIsAuthenticated(true);
            // Здесь нужно устанавливать роль, пришедшую с бэкенда
            // Например: const userRole = parseJwt(data.access).role;
            const userRole = 'technolog'; 
            setRole(userRole); 
            setUser({ username, role: userRole });

            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    };

    const logout = () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        setIsAuthenticated(false);
        setRole(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ role, isAuthenticated, user, login, logout, hasPermission }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);