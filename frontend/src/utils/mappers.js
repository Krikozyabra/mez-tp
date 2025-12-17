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

// Преобразование детального заказа с бэкенда в формат формы
export const mapBackendDetailToForm = (apiData) => ({
    id: apiData.id,
    title: apiData.name,
    description: apiData.description,
    deadline: parseDateTimeString(apiData.deadline).date,
    defaultMasterId: apiData.default_master ? String(apiData.default_master) : '',
    createdAt: apiData.created_at,

    operations: apiData.operations.map(op => {
        const startObj = parseDateTimeString(op.planned_start);
        const endObj = parseDateTimeString(op.planned_end);

        if (startObj.time === '00:00') startObj.time = '08:00';
        if (endObj.time === '00:00') endObj.time = '20:00';

        return {
            id: op.id,
            name: op.name,
            description: op.description || '',

            startDate: startObj.date,
            startTime: startObj.time,
            endDate: endObj.date,
            endTime: endObj.time,

            actualStart: op.actual_start,
            actualEnd: op.actual_end,

            durationMinutes: calculateDurationMinutes(
                createDateTime(startObj.date, startObj.time),
                createDateTime(endObj.date, endObj.time)
            ),

            workshopId: op.assembly_shop ? String(op.assembly_shop) : '',
            performerIds: op.executors?.map(String) || [],
            masterId: op.master ? String(op.master) : '',

            previousOperationId: op.previous_operation
                ? String(op.previous_operation)
                : '',
        };
    })
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
    operations: backendOrder.operations.map((op) => ({
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
        orderTitle: backendOrder.name,
        orderId: backendOrder.id, 
        workshopName: op.assembly_shop_name || '-',
        masterName: op.master_name || '-',
        masterId: op.master, 
    })),
});