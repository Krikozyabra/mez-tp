export const formatDateInputValue = (date) => {
    if (!date) return '';
    if (typeof date === 'string') {
        return date.split(' ')[0].split('T')[0];
    }
    return date.toISOString().split('T')[0];
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