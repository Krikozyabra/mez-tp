const BASE_URL = 'http://localhost:8000/api/v1';

// Вспомогательная функция для обработки ответов
const handleResponse = async (response) => {
    if (response.ok) {
        if (response.status === 204) return null;
        try {
            return await response.json();
        } catch (e) {
            return null;
        }
    }
    
    // Пытаемся достать текст ошибки
    let errorDetail = `Request failed: ${response.status}`;
    try {
        const errJson = await response.json();
        if (errJson.detail) errorDetail = errJson.detail;
        else if (typeof errJson === 'object') errorDetail = JSON.stringify(errJson);
    } catch (e) {}

    // Выбрасываем ошибку с информацией о статусе, чтобы можно было отловить 401 выше
    const error = new Error(errorDetail);
    error.status = response.status;
    throw error;
};

// Функция для получения заголовков (включая токен)
const getHeaders = () => {
    const token = localStorage.getItem('accessToken');
    return {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
};

/**
 * Обертка над fetch с автоматическим обновлением токена
 */
const authFetch = async (endpoint, options = {}) => {
    const url = `${BASE_URL}${endpoint}`;
    
    // 1. Делаем первый запрос
    const config = {
        ...options,
        headers: {
            ...getHeaders(),
            ...options.headers
        }
    };

    let response = await fetch(url, config);

    // 2. Если получили 401 (Unauthorized), пробуем обновить токен
    if (response.status === 401) {
        const refreshToken = localStorage.getItem('refreshToken');
        
        if (refreshToken) {
            try {
                // Запрос на обновление токена
                const refreshResponse = await fetch(`${BASE_URL}/auth/refresh/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ refresh: refreshToken })
                });

                if (refreshResponse.ok) {
                    const data = await refreshResponse.json();
                    
                    // Сохраняем новый access токен
                    localStorage.setItem('accessToken', data.access);
                    // Если бэкенд возвращает новый refresh токен (при ротации), сохраняем и его
                    if (data.refresh) {
                        localStorage.setItem('refreshToken', data.refresh);
                    }

                    // 3. Повторяем исходный запрос с новым токеном
                    const newConfig = {
                        ...options,
                        headers: {
                            ...getHeaders(), // Заголовки возьмутся заново из localStorage
                            ...options.headers
                        }
                    };
                    response = await fetch(url, newConfig);
                } else {
                    // Если refresh токен тоже невалиден — полный логаут
                    console.error("Refresh token expired");
                    localStorage.removeItem('accessToken');
                    localStorage.removeItem('refreshToken');
                    window.location.href = '/'; // Или вызов метода logout из контекста, если бы он был тут доступен
                    throw new Error('Session expired');
                }
            } catch (error) {
                // Ошибка сети или другая проблема при обновлении
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                throw error;
            }
        }
    }

    return handleResponse(response);
};

export const api = {
    auth: {
        // Login используем обычный fetch, чтобы не зациклить 401
        login: (username, password) => fetch(`${BASE_URL}/auth/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        }).then(handleResponse),
        
        getMe: () => authFetch('/auth/users/me/'),
    },

    logs: {
        // Получить последние 5 логов
        getLatest: () => authFetch('/logs/?limit=5&offset=0'), 
        // Получить все логи (с поиском)
        getAll: (search = '') => authFetch(`/logs/?search=${search}&limit=100`), 
    },

    orders: {
        getAll: (page = 1) => authFetch(`/order/?page=${page}`),
        getOne: (id) => authFetch(`/order/${id}/`),
        delete: (id) => authFetch(`/order/${id}/`, { method: 'DELETE' }),
        
        create: (data) => authFetch(`/order/`, { 
            method: 'POST', 
            body: JSON.stringify({
                name: data.title,
                description: data.description,
                deadline: data.deadline,
                default_master: data.defaultMasterId ? parseInt(data.defaultMasterId) : null 
            }) 
        }),

        update: (id, data) => authFetch(`/order/${id}/`, { 
            method: 'PATCH', 
            body: JSON.stringify({
                name: data.title,
                description: data.description,
                deadline: data.deadline,
                default_master: data.defaultMasterId ? parseInt(data.defaultMasterId) : null
            }) 
        }),
    },
    operations: {
        create: (data) => authFetch(`/operation/`, { 
            method: 'POST', 
            body: JSON.stringify(data) 
        }),
        
        delete: (id) => authFetch(`/operation/${id}/`, { method: 'DELETE' }),

        update: (id, data) => authFetch(`/operation/${id}/`, { 
            method: 'PATCH', 
            body: JSON.stringify(data) 
        }),

        start: (id, assemblyShopId, executorIds) => authFetch(`/operation/${id}/start/`, { 
            method: 'PATCH', 
            body: JSON.stringify({ 
                assembly_shop_id: parseInt(assemblyShopId),
                executor_ids: executorIds.map(Number)
            })
        }),

        end: (id) => authFetch(`/operation/${id}/end/`, { method: 'PATCH' }),
    },
    refs: {
        getWorkshops: () => authFetch(`/workshops/`),
        getExecutors: () => authFetch(`/executors/`),
        getExecutorsByWorkshop: (workshopId) => authFetch(`/executors/by-workshop/${workshopId}/`),
        getMasters: () => authFetch(`/masters/`),
    }
};