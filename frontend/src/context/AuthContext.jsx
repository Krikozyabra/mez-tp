import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/api'; // Импортируем наш api слой

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [role, setRole] = useState(null); // По умолчанию null (гость)
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true); // Добавим флаг загрузки

    // Функция загрузки пользователя по токену
    const loadUser = async () => {
        const token = localStorage.getItem('accessToken');
        if (!token) {
            setIsLoading(false);
            return;
        }

        try {
            // Запрашиваем данные с бэкенда
            const userData = await api.auth.getMe();
            
            if (userData) {
                setUser(userData);
                setRole(userData.role);
                setIsAuthenticated(true);
            } else {
                // Если токен протух
                logout();
            }
        } catch (error) {
            console.error("Ошибка авторизации:", error);
            logout();
        } finally {
            setIsLoading(false);
        }
    };

    // Проверка при первом заходе на сайт
    useEffect(() => {
        loadUser();
    }, []);

    const hasPermission = (requiredRoles) => {
        if (!user || !user.role) return false; 
        if (user.role === 'admin') return true;
        return requiredRoles.includes(user.role);
    };

    const login = async (username, password) => {
        try {
            // 1. Получаем токены
            const data = await api.auth.login(username, password);
            console.log(data)
            // Сохраняем токены
            localStorage.setItem('accessToken', data.access);
            localStorage.setItem('refreshToken', data.refresh);

            // 2. Сразу загружаем данные пользователя, чтобы получить роль
            await loadUser();

            return { success: true };
        } catch (error) {
            console.error(error);
            return { success: false, error: 'Неверный логин или пароль' };
        }
    };

    const logout = () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        setIsAuthenticated(false);
        setRole(null);
        setUser(null);
    };

    // Пока грузимся, можно не рендерить приложение или показать спиннер
    if (isLoading) {
        return <div>Загрузка...</div>;
    }

    return (
        <AuthContext.Provider value={{ role, isAuthenticated, user, login, logout, hasPermission }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);