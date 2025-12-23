const BASE_URL = 'http://127.0.0.1:8000/api/v1'; // dev
// const BASE_URL = '/api/v1'; // prod

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
    
    let errorDetail = `Request failed: ${response.status}`;
    try {
        const errJson = await response.json();
        if (errJson.detail) errorDetail = errJson.detail;
        else if (typeof errJson === 'object') errorDetail = JSON.stringify(errJson);
    } catch (e) {}

    const error = new Error(errorDetail);
    error.status = response.status;
    throw error;
};

const getHeaders = () => {
    const token = localStorage.getItem('accessToken');
    return {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
};

const authFetch = async (endpoint, options = {}) => {
    const url = `${BASE_URL}${endpoint}`;
    
    const config = {
        ...options,
        headers: {
            ...getHeaders(),
            ...options.headers
        }
    };

    let response = await fetch(url, config);

    if (response.status === 401) {
        const refreshToken = localStorage.getItem('refreshToken');
        
        if (refreshToken) {
            try {
                const refreshResponse = await fetch(`${BASE_URL}/auth/refresh/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ refresh: refreshToken })
                });

                if (refreshResponse.ok) {
                    const data = await refreshResponse.json();
                    
                    localStorage.setItem('accessToken', data.access);
                    if (data.refresh) {
                        localStorage.setItem('refreshToken', data.refresh);
                    }

                    const newConfig = {
                        ...options,
                        headers: {
                            ...getHeaders(),
                            ...options.headers
                        }
                    };
                    response = await fetch(url, newConfig);
                } else {
                    console.error("Refresh token expired");
                    localStorage.removeItem('accessToken');
                    localStorage.removeItem('refreshToken');
                    window.location.href = '/'; 
                    throw new Error('Session expired');
                }
            } catch (error) {
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
        login: (username, password) => fetch(`${BASE_URL}/auth/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        }).then(handleResponse),
        
        getMe: () => authFetch('/auth/users/me/'),
    },

    logs: {
        getLatest: () => authFetch('/logs/?limit=5&offset=0'), 
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
        getByOrder: (orderId) => authFetch(`/operation/by_order/${orderId}/`),
        // getFirst: () => authFetch(`/operation/first/`),

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
        createWorkshop: (name) => authFetch(`/workshops/`, {
            method: 'POST',
            body: JSON.stringify({ name })
        }),
        getExecutors: () => authFetch(`/executors/`),
        getExecutorsByWorkshop: (workshopId) => authFetch(`/executors/by-workshop/${workshopId}/`),
        getMasters: () => authFetch(`/masters/`),
    }
};