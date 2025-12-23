import { 
    formatDateInputValue, 
    formatTimeInputValue, 
    calculateDurationMinutes,
    createDateTime
} from './dateUtils';

// 1. Хелпер для очистки даты (замена пробела на T для совместимости с iOS/Safari)
const cleanDateStr = (str) => {
    if (!str) return null;
    return str.replace(' ', 'T');
};

const parseDateTimeString = (str) => {
    if (!str) return { date: '', time: '08:00' };
    const cleanStr = cleanDateStr(str);
    const d = new Date(cleanStr);
    if (isNaN(d.getTime())) return { date: '', time: '08:00' };
    
    return {
        date: formatDateInputValue(d),
        time: formatTimeInputValue(d)
    };
};

// 2. Маппер для Графика Ганта и Списков (использует безопасные даты)
const mapOperationForGantt = (op, orderTitle, orderId) => {
    // Очищаем даты перед использованием
    const safeStart = cleanDateStr(op.actual_start || op.predict_start || op.planned_start);
    const safeEnd = cleanDateStr(op.actual_end || op.predict_end || op.planned_end);
    
    return {
        id: op.id,
        name: op.name,
        
        // Даты для логики Ганта (Date objects внутри компонента их распарсят)
        startDate: safeStart,
        endDate: safeEnd,
        
        // Сырые (но очищенные) данные для отрисовки конкретных цветных полосок
        originalPlannedStart: cleanDateStr(op.planned_start),
        originalPlannedEnd: cleanDateStr(op.planned_end),
        predictStart: cleanDateStr(op.predict_start),
        predictEnd: cleanDateStr(op.predict_end),
        actualStart: cleanDateStr(op.actual_start),
        actualEnd: cleanDateStr(op.actual_end),
        
        // Логика статусов: надежнее проверять наличие дат
        completed: !!op.actual_end, 
        inProgress: !!op.actual_start && !op.actual_end,
        
        orderTitle: orderTitle,
        orderId: orderId, 
        workshopName: op.assembly_shop_name || '-',
        masterName: op.master_name || '-',
        masterId: op.master, 
    };
};

// 3. Маппер для ФОРМЫ РЕДАКТИРОВАНИЯ (Восстановлена логика времени и зависимостей)
export const mapBackendDetailToForm = (backendOrder) => {
    // Восстанавливаем логику поиска родителя (для поля "Зависит от")
    const parentMap = {};
    if (backendOrder.operations) {
        backendOrder.operations.forEach(op => {
            if (op.next_operation) {
                parentMap[op.next_operation] = op.id;
            }
        });
    }

    return {
        id: backendOrder.id,
        title: backendOrder.name,
        description: backendOrder.description,
        deadline: parseDateTimeString(backendOrder.deadline).date,
        defaultMasterId: backendOrder.default_master ? String(backendOrder.default_master) : '',
        createdAt: backendOrder.created_at,

        operations: backendOrder.operations.map((op) => {
            // Парсим дату и время отдельно для инпутов
            const startObj = parseDateTimeString(op.planned_start);
            const endObj = parseDateTimeString(op.planned_end);

            return {
                id: op.id,
                name: op.name,
                description: op.description || '',
                
                // Поля для инпутов
                startDate: startObj.date,
                startTime: startObj.time,
                endDate: endObj.date,
                endTime: endObj.time,
                
                // Длительность
                durationMinutes: calculateDurationMinutes(
                    createDateTime(startObj.date, startObj.time), 
                    createDateTime(endObj.date, endObj.time)
                ),
                
                // Фактические даты для блокировки полей
                actualStart: op.actual_start,
                actualEnd: op.actual_end,

                workshopId: op.assembly_shop ? String(op.assembly_shop) : '',
                performerIds: op.executors ? op.executors.map(String) : [],
                masterId: op.master ? String(op.master) : '',
                
                // Восстановленное поле previousOperationId
                previousOperationId: parentMap[op.id] ? String(parentMap[op.id]) : '',
                nextOperationId: op.next_operation,
            };
        })
    };
};

// Подготовка данных операции для отправки на бэкенд
export const mapOperationToBackend = (op, orderId, priorityIndex) => {
    const startStr = `${op.startDate} ${op.startTime}:00`;
    const endStr = `${op.endDate} ${op.endTime}:00`;
    const hasMaster = !!op.masterId;

    return {
        order: orderId,
        name: op.name,
        description: op.description || '',
        
        // Приоритет важен для сортировки при создании
        priority: priorityIndex + 1,

        planned_start: startStr,
        planned_end: endStr,

        assembly_shop: null,
        executors: [],

        master: hasMaster ? Number(op.masterId) : null,
        
        // Важно: мы не шлем previous_operation здесь, так как линковка идет отдельно в persistData
        // или если ваша модель поддерживает это напрямую, можно раскомментировать:
        // previous_operation: op.previousOperationId ? Number(op.previousOperationId) : null,
        
        next_operation: null 
    };
};

export const mapBackendListToFrontend = (backendOrder) => ({
    id: backendOrder.id,
    title: backendOrder.name,
    // Очищаем дату дедлайна
    deadline: backendOrder.deadline ? cleanDateStr(backendOrder.deadline).split('T')[0] : '',
    defaultMasterId: backendOrder.default_master,
    operations: backendOrder.operations.map((op) => 
        mapOperationForGantt(op, backendOrder.name, backendOrder.id)
    ),
});

export const mapExecutorAggregationToFrontend = (executor) => ({
    id: executor.id,
    title: executor.full_name,
    totalTasks: executor.total_tasks,
    activeTasks: executor.active_tasks_count,
    
    operations: executor.tasks.map(task => 
        mapOperationForGantt(task, task.order_name, task.order_id)
    )
});