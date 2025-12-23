import { 
    formatDateInputValue, 
    formatTimeInputValue, 
    calculateDurationMinutes,
    createDateTime
} from './dateUtils';

const parseDateTimeString = (str) => {
    if (!str) return { date: '', time: '08:00' };
    const cleanStr = str.replace(' ', 'T'); // Fix for Django default string
    const d = new Date(cleanStr);
    if (isNaN(d.getTime())) return { date: '', time: '08:00' };
    
    return {
        date: formatDateInputValue(d),
        time: formatTimeInputValue(d)
    };
};

const mapOperationForGantt = (op, orderTitle, orderId) => ({
    id: op.id,
        name: op.name,
        // Для Ганта берем полную строку даты-времени
        originalPlannedStart: op.planned_start,
        originalPlannedEnd: op.planned_end,
        
        startDate: op.actual_start || op.planned_start,
        endDate: op.actual_end || op.planned_end,
        
        predictStart: op.predict_start,
        predictEnd: op.predict_end,
        actualStart: op.actual_start,
        actualEnd: op.actual_end,
        
        completed: op.status === "completed",
        inProgress: op.status === "in_progress",
        orderTitle: orderTitle,
        orderId: orderId, 
        workshopName: op.assembly_shop_name || '-',
        masterName: op.master_name || '-',
        masterId: op.master, 
});

// Преобразование детального заказа с бэкенда в формат формы
export const mapBackendDetailToForm = (backendOrder) => ({
    id: backendOrder.id,
    title: backendOrder.name,
    description: backendOrder.description,
    deadline: parseDateTimeString(backendOrder.deadline).date,
    defaultMasterId: backendOrder.default_master ? String(backendOrder.default_master) : '',
    createdAt: backendOrder.created_at,

    operations: backendOrder.operations.map((op) => 
        mapOperationForGantt(op, backendOrder.name, backendOrder.id)
    )
});

// Подготовка данных операции для отправки на бэкенд
export const mapOperationToBackend = (op, orderId) => {
    const startStr = `${op.startDate} ${op.startTime}:00`;
    const endStr = `${op.endDate} ${op.endTime}:00`;

    return {
        order: orderId,
        name: op.name,
        description: op.description || '',

        planned_start: startStr,
        planned_end: endStr,

        assembly_shop: null,
        executors: [],

        master: op.masterId ? Number(op.masterId) : null,

        previous_operation: op.previousOperationId
            ? Number(op.previousOperationId)
            : null,
    };
};

export const mapBackendListToFrontend = (backendOrder) => ({
    // ... этот маппер можно оставить как есть, либо тоже обновить safeDate,
    // но он используется для списка, где время не так критично отображать детально.
    // Оставим старую реализацию для списка, но поправим safeDate для корректности
    id: backendOrder.id,
    title: backendOrder.name,
    deadline: backendOrder.deadline ? backendOrder.deadline.split(/[ T]/)[0] : '',
    defaultMasterId: backendOrder.default_master,
    operations: backendOrder.operations.map((op) => 
        mapOperationForGantt(op, backendOrder.name, backendOrder.id)
    ),
});

export const mapExecutorAggregationToFrontend = (executor) => ({
    id: executor.id,
    title: executor.full_name, // Используем имя как заголовок группы
    totalTasks: executor.total_tasks,
    activeTasks: executor.active_tasks_count,
    
    // Мапим задачи в формат операций Ганта
    operations: executor.tasks.map(task => 
        mapOperationForGantt(task, task.order_name, task.order_id)
    )
});