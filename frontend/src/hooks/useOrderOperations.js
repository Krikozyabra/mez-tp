import { useState } from 'react';
import { formatDateInputValue, addDays, addMinutes } from '../utils/dateUtils';

export const useOrderOperations = (initialOperations = []) => {
    const [operations, setOperations] = useState(initialOperations);

    const addOperation = () => {
        const today = new Date();
        const lastOperation = operations[operations.length - 1];
        
        // Авто-даты: следующий день после последней операции
        const startDate = lastOperation 
            ? formatDateInputValue(addDays(new Date(lastOperation.endDate), 0))
            : formatDateInputValue(today);
        const endDate = lastOperation
            ? formatDateInputValue(addDays(new Date(lastOperation.endDate), 1))
            : formatDateInputValue(addDays(today, 1));

        const newOperation = {
            id: crypto.randomUUID(),
            name: `Операция ${operations.length + 1}`,
            description: '',
            workshopId: '',
            performerIds: [],
            masterId: '',
            startDate,
            endDate,
            durationMinutes: 0,
            // priority убран
        };
        setOperations(prev => [...prev, newOperation]);
    };

    const removeOperation = (id) => {
        setOperations(prev => prev.filter(op => op.id !== id));
    };

    const updateOperation = (operationId, field, value) => {
        setOperations(prev => prev.map(op => {
            if (op.id !== operationId) return op;

            let processedValue = value;
            if (field === 'durationMinutes') {
                processedValue = parseInt(value) || 0;
            }

            const updated = { ...op, [field]: processedValue };

            // Пересчет длительности
            if ((field === 'endDate' || field === 'startDate') && updated.startDate && updated.endDate) {
                const start = new Date(updated.startDate);
                const end = new Date(updated.endDate);
                if (end > start) {
                    const diffMs = end - start;
                    updated.durationMinutes = Math.round(diffMs / (1000 * 60));
                } else {
                    updated.durationMinutes = 0;
                }
            }

            // Пересчет даты конца по минутам
            if (field === 'durationMinutes' && updated.startDate) {
                const start = new Date(updated.startDate);
                const end = addMinutes(start, processedValue);
                updated.endDate = formatDateInputValue(end);
            }

            return updated;
        }));
    };

    const togglePerformer = (operationId, performerId) => {
        setOperations(prev => prev.map(op => {
            if (op.id !== operationId) return op;
            const strId = String(performerId);
            const currentIds = (op.performerIds || []).map(String);
            const isSelected = currentIds.includes(strId);
            return {
                ...op,
                performerIds: isSelected 
                    ? currentIds.filter(id => id !== strId) 
                    : [...currentIds, strId]
            };
        }));
    };

    return {
        operations,
        setOperations,
        addOperation,
        removeOperation,
        updateOperation,
        togglePerformer
    };
};