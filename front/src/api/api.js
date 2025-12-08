const BASE_URL = 'http://127.0.0.1:8000/api/v1';

const getHeaders = () => {
    const token = localStorage.getItem('accessToken');
    return {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
};

const handleResponse = async (response) => {
    if (response.ok) {
        if (response.status === 204) return null;
        try {
            return await response.json();
        } catch (e) {
            return null;
        }
    }
    // Логируем ошибку для отладки
    console.error(`API Error: ${response.status} ${response.statusText} at ${response.url}`);
    throw new Error(`Request failed: ${response.status}`);
};

export const api = {
    orders: {
        // Исправлено на orders (было order)
        getAll: () => fetch(`${BASE_URL}/orders/`, { headers: getHeaders() }).then(handleResponse),
        getOne: (id) => fetch(`${BASE_URL}/orders/${id}/`, { headers: getHeaders() }).then(handleResponse),
        delete: (id) => fetch(`${BASE_URL}/orders/${id}/`, { 
            method: 'DELETE', 
            headers: getHeaders() 
        }).then(handleResponse),
        create: (data) => fetch(`${BASE_URL}/orders/`, { 
            method: 'POST', 
            headers: getHeaders(), 
            body: JSON.stringify({
                name: data.title,
                description: data.description,
            }) 
        }).then(handleResponse),

        update: (id, data) => fetch(`${BASE_URL}/orders/${id}/`, { 
            method: 'PUT',
            headers: getHeaders(), 
            body: JSON.stringify({
                name: data.title,
                description: data.description
            }) 
        }).then(handleResponse),
    },
    operations: {
        // Исправлено на operations (было operation)
        create: (data) => fetch(`${BASE_URL}/operations/`, { 
            method: 'POST', 
            headers: getHeaders(), 
            body: JSON.stringify(data) 
        }).then(handleResponse),
        
        delete: (id) => fetch(`${BASE_URL}/operations/${id}/`, { 
            method: 'DELETE', 
            headers: getHeaders() 
        }).then(handleResponse),
        
        getLastInShop: async (shopId) => {
            const res = await fetch(`${BASE_URL}/operations/last-in-shop/${shopId}/`, { headers: getHeaders() });
            if (!res.ok) return null;
            let data = await res.json();
            if (typeof data === 'string') {
                try { data = JSON.parse(data); } catch(e) {}
            }
            return data;
        },

        complete: (id) => fetch(`${BASE_URL}/operations/complete/${id}/`, { 
            method: 'PUT', 
            headers: getHeaders(),
            body: JSON.stringify({ completed: true })
        }).then(handleResponse),

        update: (id, data) => fetch(`${BASE_URL}/operations/${id}/`, { 
            method: 'PUT', 
            headers: getHeaders(), 
            body: JSON.stringify(data) 
        }).then(handleResponse),

        // Исправлен путь на /first/ (чтобы совпадало с urls.py)
        getFirst: () => fetch(`${BASE_URL}/operations/first/`, { 
            headers: getHeaders() 
        }).then(handleResponse),
    },
    refs: {
        // Исправлено на workshops и executors
        getWorkshops: () => fetch(`${BASE_URL}/workshops/`, { headers: getHeaders() }).then(handleResponse),
        getExecutors: () => fetch(`${BASE_URL}/executors/`, { headers: getHeaders() }).then(handleResponse),
        getExecutorsByWorkshop: (workshopId) => 
            fetch(`${BASE_URL}/executors/by-workshop/${workshopId}/`, { headers: getHeaders() })
            .then(handleResponse),
        getMasters: () => fetch(`${BASE_URL}/masters/`, { headers: getHeaders() }).then(handleResponse),
    }
};