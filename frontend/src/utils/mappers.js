import { formatDateInputValue, calculateDurationMinutes } from './dateUtils';

const safeDate = (dateStr) => {
    if (!dateStr) return '';
    return typeof dateStr === 'string' ? dateStr.split(/[ T]/)[0] : '';
};

// Преобразование детального заказа с бэкенда в формат формы
export const mapBackendDetailToForm = (apiData) => {
    
    // 1. Создаем карту зависимостей: { ID_дочерней : ID_родительской }
    const parentMap = {};
    
    if (apiData.operations) {
        apiData.operations.forEach(op => {
            // Если у операции есть next_operation (ID следующей),
            // значит ТЕКУЩАЯ операция является "предыдущей" для той "следующей".
            if (op.next_operation) {
                parentMap[op.next_operation] = op.id;
            }
        });
    }

    return {
        id: apiData.id,
        title: apiData.name,
        description: apiData.description,
        deadline: safeDate(apiData.deadline), 
        defaultMasterId: apiData.default_master ? String(apiData.default_master) : '',
        createdAt: apiData.created_at,
        
        operations: apiData.operations.map(op => ({
            id: op.id,
            name: op.name,
            description: op.description || '',
            
            startDate: safeDate(op.planned_start),
            endDate: safeDate(op.planned_end),
            actualStart: op.actual_start, 
            actualEnd: op.actual_end,
            durationMinutes: op.duration_minutes || calculateDurationMinutes(op.planned_start, op.planned_end),
            
            workshopId: op.assembly_shop ? String(op.assembly_shop) : '',
            performerIds: op.executors ? op.executors.map(String) : [],
            masterId: op.master ? String(op.master) : '',
            
            needsControl: op.needs_master_check,
            
            previousOperationId: parentMap[op.id] ? String(parentMap[op.id]) : '',
            
            // Сохраняем raw next_operation для справки (хотя в UI он не редактируется напрямую)
            nextOperationId: op.next_operation,
        }))
    };
};

// Подготовка данных операции для отправки на бэкенд
export const mapOperationToBackend = (op, orderId, priorityIndex) => {
    // Если masterId выбран (не пустая строка), значит контроль нужен
    const hasMaster = !!op.masterId;

    return {
        order: orderId,
        name: op.name,
        description: op.description || '',
        priority: priorityIndex + 1, 
        
        planned_start: op.startDate ? `${op.startDate} 09:00:00` : null,
        planned_end: op.endDate ? `${op.endDate} 18:00:00` : null,
        
        assembly_shop: op.workshopId ? parseInt(op.workshopId) : null,
        executors: op.performerIds ? op.performerIds.map(id => parseInt(id)) : [],
        
        // Если выбран мастер -> отправляем ID, иначе null
        master: hasMaster ? parseInt(op.masterId) : null,
        
        // Автоматически выставляем флаг
        needs_master_check: hasMaster, 
        
        next_operation: null 
    };
};

export const mapBackendListToFrontend = (backendOrder) => ({
    id: backendOrder.id,
    title: backendOrder.name,
    deadline: safeDate(backendOrder.deadline),
    defaultMasterId: backendOrder.default_master,
    operations: backendOrder.operations.map((op) => ({
        id: op.id,
        name: op.name,
        startDate: safeDate(op.actual_start || op.predict_start || op.planned_start),
        endDate: safeDate(op.actual_end || op.predict_end || op.planned_end),
        
        originalPlannedStart: safeDate(op.planned_start),
        originalPlannedEnd: safeDate(op.planned_end),
        
        predictStart: safeDate(op.predict_start),
        predictEnd: safeDate(op.predict_end),
        
        actualStart: safeDate(op.actual_start),
        actualEnd: safeDate(op.actual_end),

        completed: op.status === "completed",
        inProgress: op.status === "in_progress",

        orderTitle: backendOrder.name,
        orderId: backendOrder.id, 
        workshopName: op.assembly_shop_name || '-',
        masterName: op.master_name || '-',
        masterId: op.master, 
    })),
});