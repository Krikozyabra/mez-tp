// Форматирует Date в "YYYY-MM-DD"
export const formatDateInputValue = (date) => {
    if (!date) return '';
    try {
        const d = new Date(date);
        // Учитываем локальный часовой пояс, чтобы не было сдвигов
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    } catch (e) { return ''; }
};

// Форматирует Date в "HH:mm"
export const formatTimeInputValue = (date) => {
    if (!date) return '00:00';
    try {
        const d = new Date(date);
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        return `${hours}:${minutes}`;
    } catch (e) { return '00:00'; }
};

export const createDateTime = (dateStr, timeStr) => {
    if (!dateStr) return null;
    const time = timeStr || '00:00';
    return new Date(`${dateStr}T${time}`);
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

export const calculateDurationMinutes = (start, end) => {
    if (!start || !end) return 0;
    const s = new Date(start);
    const e = new Date(end);
    if (e <= s) return 0;
    return Math.round((e - s) / (1000 * 60));
};