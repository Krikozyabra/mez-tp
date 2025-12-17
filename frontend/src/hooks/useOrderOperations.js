import { useState } from 'react';
import { 
    formatDateInputValue, 
    formatTimeInputValue, 
    addDays, 
    addMinutes, 
    createDateTime, 
    calculateDurationMinutes 
} from '../utils/dateUtils';

export const useOrderOperations = (initialOperations = []) => {
    const [operations, setOperations] = useState(initialOperations);

    const addOperation = (initialMasterId = '') => {
        const today = new Date();
        const lastOperation = operations[operations.length - 1];
        
        // По умолчанию ставим на следующий день или сегодня
        const baseDate = lastOperation 
            ? addDays(new Date(lastOperation.endDate), 0)
            : today;
            
        const startDate = formatDateInputValue(baseDate);
        const startTime = '08:00';
        
        // По ТЗ: конец в 20:00 того же дня
        const endDate = startDate;
        const endTime = '20:00';
        
        const startObj = createDateTime(startDate, startTime);
        const endObj = createDateTime(endDate, endTime);
        const duration = calculateDurationMinutes(startObj, endObj);

        const newOperation = {
            id: crypto.randomUUID(),
            name: `Операция ${operations.length + 1}`,
            description: '',
            masterId: initialMasterId,
            
            startDate,
            startTime,
            endDate,
            endTime,
            
            durationMinutes: duration,
            previousOperationId: '', 
        };
        setOperations(prev => [...prev, newOperation]);
    };

    const removeOperation = (id) => {
        setOperations(prev => prev.filter(op => op.id !== id));
    };

    const updateOperation = (operationId, field, value) => {
        setOperations(prev => {
            const currentOpIndex = prev.findIndex(op => op.id === operationId);
            if (currentOpIndex === -1) return prev;

            const currentOp = { ...prev[currentOpIndex] };
            
            // === 1. ИЗМЕНЕНИЕ ЗАВИСИМОСТИ ===
            if (field === 'previousOperationId') {
                currentOp.previousOperationId = value;
                
                // Если выбрали какую-то операцию (не "Нет")
                if (value) {
                    // Ищем родительскую операцию в текущем списке
                    // Приводим ID к строке для надежного сравнения
                    const parentOp = prev.find(p => String(p.id) === String(value));
                    
                    if (parentOp && parentOp.endDate) {
                        // Устанавливаем НАЧАЛО текущей = КОНЕЦ родительской
                        currentOp.startDate = parentOp.endDate;
                        // Если у родителя нет времени (старые данные), ставим 20:00, иначе реальное
                        currentOp.startTime = parentOp.endTime || '20:00'; 
                        
                        // Теперь пересчитываем КОНЕЦ текущей, опираясь на её длительность
                        // (чтобы операция "сдвинулась", а не сжалась/растянулась)
                        if (currentOp.durationMinutes >= 0) {
                            const newStartObj = createDateTime(currentOp.startDate, currentOp.startTime);
                            const newEndObj = addMinutes(newStartObj, currentOp.durationMinutes);
                            
                            currentOp.endDate = formatDateInputValue(newEndObj);
                            currentOp.endTime = formatTimeInputValue(newEndObj);
                        }
                    }
                }
            }
            // === 2. ИЗМЕНЕНИЕ ДАТЫ/ВРЕМЕНИ НАЧАЛА (Сдвигаем конец) ===
            else if (field === 'startDate' || field === 'startTime') {
                currentOp[field] = value;
                
                if (currentOp.startDate && currentOp.startTime) {
                    const newStart = createDateTime(currentOp.startDate, currentOp.startTime);
                    const newEnd = addMinutes(newStart, currentOp.durationMinutes);
                    
                    currentOp.endDate = formatDateInputValue(newEnd);
                    currentOp.endTime = formatTimeInputValue(newEnd);
                }
            }
            // === 3. ИЗМЕНЕНИЕ ДАТЫ/ВРЕМЕНИ КОНЦА (Меняем длительность) ===
            else if (field === 'endDate' || field === 'endTime') {
                currentOp[field] = value;
                
                if (currentOp.startDate && currentOp.endDate) {
                    const start = createDateTime(currentOp.startDate, currentOp.startTime);
                    const end = createDateTime(currentOp.endDate, currentOp.endTime);
                    
                    if (end > start) {
                        currentOp.durationMinutes = calculateDurationMinutes(start, end);
                    }
                }
            }
            // === 4. ИЗМЕНЕНИЕ ДЛИТЕЛЬНОСТИ (Меняем конец) ===
            else if (field === 'durationMinutes') {
                const minutes = parseInt(value) || 0;
                currentOp.durationMinutes = minutes;
                
                if (currentOp.startDate) {
                    const start = createDateTime(currentOp.startDate, currentOp.startTime);
                    const end = addMinutes(start, minutes);
                    
                    currentOp.endDate = formatDateInputValue(end);
                    currentOp.endTime = formatTimeInputValue(end);
                }
            }
            // === 5. ОБЫЧНОЕ ПОЛЕ ===
            else {
                currentOp[field] = value;
            }

            const newOps = [...prev];
            newOps[currentOpIndex] = currentOp;
            return newOps;
        });
    };

    return {
        operations,
        setOperations,
        addOperation,
        removeOperation,
        updateOperation,
    };
};