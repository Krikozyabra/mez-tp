export const formatDateInputValue = (date) => {
    if (!date) return '';
    // Если уже строка YYYY-MM-DD
    if (typeof date === 'string' && date.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return date;
    }
    // Если ISO строка
    if (typeof date === 'string') {
        return date.split('T')[0];
    }
    // Если объект Date
    try {
        return date.toISOString().split('T')[0];
    } catch (e) {
        return '';
    }
};

export const addDays = (date, days) => {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
};

export const addMinutes = (date, minutes) => {
    const next = new Date(date);
    next.setMinutes(next.getMinutes() + minutes);
    return next;
};

export const calculateDurationMinutes = (startStr, endStr) => {
    if (!startStr || !endStr) return 0;
    const start = new Date(startStr);
    const end = new Date(endStr);
    if (end <= start) return 0;
    const diffMs = end - start;
    return Math.round(diffMs / (1000 * 60));
};