import { formatDateInputValue, calculateDurationMinutes } from './dateUtils';

// Преобразование детального заказа с бэкенда в формат формы
export const mapBackendDetailToForm = (apiData) => {
    return {
        id: apiData.id,
        title: apiData.name,
        description: apiData.description,
        operations: apiData.operations.map(op => ({
            id: op.id,
            name: op.name,
            description: op.description || '',
            startDate: formatDateInputValue(op.planned_start),
            endDate: formatDateInputValue(op.planned_end),
            durationMinutes: calculateDurationMinutes(op.planned_start, op.planned_end),
            
            workshopId: op.assembly_shop ? String(op.assembly_shop) : '',
            performerIds: op.executors ? op.executors.map(String) : [],
            priority: op.priority,
            
            needsControl: op.needs_master_check,
            masterId: op.master_checker ? String(op.master_checker) : '',
            assignedTo: op.needs_master_check ? 'master' : 'technolog'
        }))
    };
};

// Преобразование списка заказов
export const mapBackendListToFrontend = (backendOrder) => ({
    id: backendOrder.id,
    title: backendOrder.name || `Заказ #${backendOrder.id}`,
    operations: backendOrder.operations.map((op) => ({
        id: op.id,
        name: op.name,
        
        // Даты для ОСНОВНОЙ полоски (фактический прогресс)
        // Если есть факт. старт - берем его, иначе план
        startDate: formatDateInputValue(op.actual_start || op.planned_start),
        // Если есть факт. конец - берем его, иначе актуальный план
        endDate: formatDateInputValue(op.actual_end || op.actual_planned_end || op.planned_end),
        
        // Даты для ПЛАНОВОЙ полоски (вторая линия)
        originalPlannedStart: formatDateInputValue(op.planned_start),
        originalPlannedEnd: formatDateInputValue(op.planned_end),

        assignedTo: op.needs_master_check ? 'master' : 'technolog',
        completed: op.completed,
        orderTitle: backendOrder.name,
        
        // 1) Название цеха
        workshopName: op.assembly_shop_name || 'Цех не назначен' 
    })),
});

// Подготовка данных операции для отправки на бэкенд
export const mapOperationToBackend = (op, orderId) => ({
    name: op.name,
    description: op.description || '',
    priority: parseInt(op.priority),
    planned_start: `${op.startDate} 09:00:00`,
    planned_end: `${op.endDate} 18:00:00`,
    needs_master_check: op.needsControl,
    master_checker: op.needsControl && op.masterId ? parseInt(op.masterId) : null,
    completed: false,
    order: orderId,
    assembly_shop: parseInt(op.workshopId),
    executors: op.performerIds.map(id => parseInt(id))
});

// Подготовка всего заказа
export const mapOrderToBackend = (id, title, description, operations) => ({
    id: id,
    title: title,
    description: description,
    operations: operations.map(op => ({
        ...op, // Внутренний формат сохраняем, конвертация произойдет при сохранении операций отдельно или при общей логике
        // Здесь можно добавить логику, если бэкенд принимает вложенные операции при сохранении заказа
        // Но пока предположим, что отправляем плоскую структуру, как в OrderFormPage
        workshopId: op.workshopId ? parseInt(op.workshopId) : null,
        performerIds: op.performerIds.map(id => parseInt(id)),
        masterId: op.needsControl && op.masterId ? parseInt(op.masterId) : null,
    }))
});