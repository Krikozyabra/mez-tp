import { useState } from 'react';
import { formatDateInputValue, addDays, addMinutes } from '../utils/dateUtils';
import { api } from '../api/api';

export const useOrderOperations = (initialOperations = []) => {
    const [operations, setOperations] = useState(initialOperations);

    const addOperation = () => {
        const today = new Date();
        const lastOperation = operations[operations.length - 1];
        const startDate = lastOperation 
            ? formatDateInputValue(addDays(new Date(lastOperation.endDate), 1))
            : formatDateInputValue(today);
        const endDate = lastOperation
            ? formatDateInputValue(addDays(new Date(lastOperation.endDate), 4))
            : formatDateInputValue(addDays(today, 3));

        const newOperation = {
            id: crypto.randomUUID(),
            name: '',
            description: '',
            workshopId: '',
            performerIds: [],
            priority: 2,
            startDate,
            endDate,
            durationMinutes: 0,
            needsControl: false,
            masterId: '',
            assignedTo: 'technolog',
        };
        setOperations(prev => [...prev, newOperation]);
    };

    const removeOperation = (id) => {
        setOperations(prev => prev.filter(op => op.id !== id));
    };

    const updateOperation = async (operationId, field, value) => {
        // Синхронное обновление стейта
        setOperations(prev => prev.map(op => {
            if (op.id !== operationId) return op;

            let processedValue = value;
            if (field === 'priority' || field === 'durationMinutes') {
                processedValue = parseInt(value) || 0;
            }

            const updated = { ...op, [field]: processedValue };

            // Логика пересчета дат/минут
            if (field === 'endDate' && updated.startDate && updated.endDate) {
                const start = new Date(updated.startDate);
                const end = new Date(updated.endDate);
                if (end > start) {
                    const diffMs = end - start;
                    updated.durationMinutes = Math.round(diffMs / (1000 * 60));
                } else {
                    updated.durationMinutes = 0;
                }
            }

            if (field === 'durationMinutes' && updated.startDate) {
                const start = new Date(updated.startDate);
                const end = addMinutes(start, processedValue);
                updated.endDate = formatDateInputValue(end);
            }

            return updated;
        }));

        // Асинхронная логика (запрос последней даты)
        if (field === 'workshopId' && value) {
            try {
                const data = await api.operations.getLastInShop(value);
                if (data && data.actual_planned_end) {
                    const newStartDate = formatDateInputValue(data.actual_planned_end);
                    
                    setOperations(prev => prev.map(op => {
                        if (op.id !== operationId) return op;
                        
                        const updated = { ...op, startDate: newStartDate };
                        if (op.durationMinutes > 0) {
                            const start = new Date(newStartDate);
                            const end = addMinutes(start, op.durationMinutes);
                            updated.endDate = formatDateInputValue(end);
                        } else {
                            updated.endDate = newStartDate;
                        }
                        return updated;
                    }));
                }
            } catch (error) {
                console.error("Failed to fetch last operation date", error);
            }
        }
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
        setOperations, // Для полной замены если нужно
        addOperation,
        removeOperation,
        updateOperation,
        togglePerformer
    };
};