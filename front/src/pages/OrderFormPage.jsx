import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../api/api';
import { useOrderOperations } from '../hooks/useOrderOperations';
import { mapOrderToBackend, mapOperationToBackend, mapBackendDetailToForm } from '../utils/mappers';
import OperationCard from '../components/OperationCard';
import DeleteConfirmModal from '../components/DeleteConfirmModal';
import styles from './OrderFormPage.module.css';

const OrderFormPage = ({ order, onSave, onCancel, onDelete, focusOperationId }) => {
    const isEditMode = !!order;
    const [orderTitle, setOrderTitle] = useState(order?.title || '');
    const [orderDescription, setOrderDescription] = useState(order?.description || '');
    
    // --- Состояния для справочников ---
    const [workshops, setWorkshops] = useState([]);
    const [executorsByWorkshop, setExecutorsByWorkshop] = useState({});
    const [isLoadingRefs, setIsLoadingRefs] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [mastersList, setMastersList] = useState([]);
    const [originalOperations, setOriginalOperations] = useState([]);

    // --- Состояния для модальных окон ---
    const [isOpDeleteModalOpen, setIsOpDeleteModalOpen] = useState(false);
    const [isOrderDeleteModalOpen, setIsOrderDeleteModalOpen] = useState(false);
    const [operationToDelete, setOperationToDelete] = useState(null);
    

    const { 
        operations, 
        setOperations,
        addOperation, 
        removeOperation, 
        updateOperation,
        togglePerformer
    } = useOrderOperations(order?.operations);

    // --- ЗАГРУЗКА ИСПОЛНИТЕЛЕЙ ---
    const fetchExecutorsForWorkshop = useCallback(async (workshopId) => {
        if (!workshopId) return;
        if (executorsByWorkshop[workshopId]) return;

        try {
            const data = await api.refs.getExecutorsByWorkshop(workshopId);
            setExecutorsByWorkshop(prev => ({
                ...prev,
                [workshopId]: data || []
            }));
        } catch (error) {
            console.error(`Error loading executors for workshop ${workshopId}`, error);
        }
    }, [executorsByWorkshop]);

    // --- ПЕРВОНАЧАЛЬНАЯ ЗАГРУЗКА ---
    useEffect(() => {
        const initData = async () => {
            setIsLoadingRefs(true);
            try {
                const [workshopsData, mastersData] = await Promise.all([
                    api.refs.getWorkshops(),
                    api.refs.getMasters() // Запрос мастеров
                ]);

                setWorkshops(workshopsData?.results || []); // Сохраняем
                setMastersList(mastersData?.results || []); // Сохраняем

                const uniqueWorkshopIds = [...new Set(operations
                    .map(op => op.workshopId)
                    .filter(id => id)
                )];
                
                await Promise.all(uniqueWorkshopIds.map(id => fetchExecutorsForWorkshop(id)));
            } catch (err) {
                console.error("Ref loading error", err);
            } finally {
                setIsLoadingRefs(false);
            }
        };
        initData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Инициализация originalOperations при первой загрузке
    useEffect(() => {
        if (order?.operations) {
            // Создаем глубокую копию, чтобы разорвать ссылки
            setOriginalOperations(JSON.parse(JSON.stringify(order.operations)));
        }
    }, [order]); // Зависимость от order (приходит пропсом при открытии)

     // --- ЛОГИКА СКРОЛЛА К ОПЕРАЦИИ ---
    
    // Создаем Map для хранения ссылок на DOM-элементы карточек
    const itemsRef = useRef(new Map());

    useEffect(() => {
        // Запускаем эффект, когда operations загружены и есть ID для фокуса
        if (focusOperationId && operations.length > 0) {
            const node = itemsRef.current.get(focusOperationId);
            if (node) {
                // Небольшая задержка, чтобы модалка успела отрисоваться/анимироваться
                setTimeout(() => {
                    node.scrollIntoView({ 
                        behavior: 'smooth', 
                        block: 'center' 
                    });
                    
                    // Опционально: Добавить эффект подсветки на пару секунд
                    node.style.transition = 'box-shadow 0.5s';
                    node.style.boxShadow = '0 0 0 2px #3b82f6, 0 0 15px rgba(59, 130, 246, 0.5)';
                    setTimeout(() => {
                        node.style.boxShadow = 'none';
                    }, 2000);
                }, 100);
            }
        }
    }, [focusOperationId, operations]); // Зависимости

    // --- ОБРАБОТЧИК ИЗМЕНЕНИЙ ---
    const handleOperationChange = async (opId, field, value) => {
        updateOperation(opId, field, value);
        
        if (field === 'workshopId' && value) {
            fetchExecutorsForWorkshop(value);
            updateOperation(opId, 'performerIds', []); 

            // 5) АВТОМАТИЧЕСКИЙ ПРИОРИТЕТ
            try {
                // Используем существующий метод API
                const lastOpData = await api.operations.getLastInShop(value);
                
                // Если есть последняя операция, берем её приоритет + 1
                // Если цех пустой (data === null), ставим приоритет 1
                const newPriority = lastOpData ? (parseInt(lastOpData.priority) + 1) : 1;
                
                updateOperation(opId, 'priority', newPriority);
            } catch (e) {
                console.error("Auto priority error", e);
                // Фоллбэк на 1
                updateOperation(opId, 'priority', 1);
            }
        }
    };

    // Хелпер для сравнения объектов (проверяем, изменилась ли операция)
    const checkIsDirty = (currentOp) => {
        // Ищем эту же операцию в "эталонном" массиве
        const original = originalOperations.find(op => op.id === currentOp.id);
        
        // Если в эталоне нет (это новая операция, добавленная кнопкой +), то она "грязная"
        if (!original) return true;

        // Сравниваем JSON-строки (самый простой способ глубокого сравнения данных)
        // Важно: порядок полей должен совпадать, но так как мы клонируем объекты, обычно это работает
        return JSON.stringify(currentOp) !== JSON.stringify(original);
    };

    // --- ЛОГИКА УДАЛЕНИЯ ---
    const handleInitiateOpDelete = (op) => {
        setOperationToDelete(op);
        setIsOpDeleteModalOpen(true);
    };

    const handleConfirmOpDelete = async () => {
        if (!operationToDelete) return;
        const isLocal = typeof operationToDelete.id === 'string' && operationToDelete.id.length > 20;
        if (!isLocal) {
            try { await api.operations.delete(operationToDelete.id); } 
            catch (error) { console.error(error); alert('Ошибка удаления'); return; }
        }
        removeOperation(operationToDelete.id);
        setIsOpDeleteModalOpen(false);
        setOperationToDelete(null);
    };

    const handleInitiateOrderDelete = () => setIsOrderDeleteModalOpen(true);

    const handleConfirmOrderDelete = async () => {
        if (!order?.id) return;
        try {
            await api.orders.delete(order.id);
            if (onDelete) onDelete();
        } catch (error) {
            console.error(error); alert('Ошибка удаления заказа');
        } finally {
            setIsOrderDeleteModalOpen(false);
        }
    };

    // --- ЛОГИКА СОХРАНЕНИЯ ОДНОЙ ОПЕРАЦИИ (ИСПРАВЛЕНО) ---
    const handleSaveSingleOperation = async (operation) => {
        // 1. Валидация
        if (!operation.name.trim()) return alert('Введите название операции');
        if (!operation.workshopId) return alert('Выберите цех');
        if (!operation.startDate || !operation.endDate) return alert('Заполните даты');

        // Проверка ID заказа
        let orderId = order?.id;
        // Если ID длинный (UUID), значит заказ еще не сохранен на бэкенде
        const isNewOrderOnBackend = typeof orderId === 'string' && orderId.length > 20;
        
        if (isNewOrderOnBackend) {
             alert('Сначала сохраните сам заказ (кнопка внизу), чтобы создать его в системе.');
             return;
        }

        try {
            const payload = mapOperationToBackend(operation, orderId);
            
            // Проверка: новая операция или обновление?
            const isOpNew = typeof operation.id === 'string' && operation.id.length > 20;
            
            let savedOpData;
            if (isOpNew) {
                savedOpData = await api.operations.create(payload);
            } else {
                savedOpData = await api.operations.update(operation.id, payload);
            }

            // Формируем обновленный объект операции (с реальным ID)
            const updatedOp = { ...operation, id: savedOpData.id || savedOpData.pk };

            // ВАЖНО: Обновляем локальный стейт (меняем UUID на реальный ID)
            setOperations(prev => prev.map(op => {
                if (op.id === operation.id) return updatedOp;
                return op;
            }));

            setOriginalOperations(prev => {
                // Удаляем старую версию (если была) и добавляем новую
                const filtered = prev.filter(op => op.id !== operation.id);
                return [...filtered, updatedOp];
            });

            alert('Операция успешно сохранена!');
        } catch (e) {
            console.error(e);
            alert('Ошибка при сохранении операции. Проверьте консоль.');
        }
    };

    // --- ЛОГИКА МАССОВОГО СОХРАНЕНИЯ ---
    const persistData = async () => {
        if (!orderTitle.trim()) { alert('Введите название заказа'); return false; }
        
        setIsSaving(true);
        try {
            let orderId = order?.id;
            const isNewOrderOnBackend = typeof orderId === 'string' && orderId.length > 20; 

            if (isNewOrderOnBackend) {
                const createdOrder = await api.orders.create({ title: orderTitle, description: orderDescription });
                orderId = createdOrder.id;
            } else {
                await api.orders.update(orderId, { title: orderTitle, description: orderDescription });
            }

            const operationPromises = operations.map(op => {
                const payload = mapOperationToBackend(op, orderId);
                const isOpNew = typeof op.id === 'string' && op.id.length > 20;
                return isOpNew ? api.operations.create(payload) : api.operations.update(op.id, payload);
            });

            await Promise.all(operationPromises);

            // Получаем свежие данные с сервера
            const updatedOrderData = await api.orders.getOne(orderId);
            const formFormat = mapBackendDetailToForm(updatedOrderData);

            // Обновляем текущий список
            setOperations(formFormat.operations);

            // ВАЖНО: Обновляем эталонный список тоже
            setOriginalOperations(JSON.parse(JSON.stringify(formFormat.operations)));

            return orderId;
        } catch (error) {
            console.error("Save error:", error);
            alert("Ошибка сохранения.");
            return false;
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveOrderClick = async () => {
        const savedOrderId = await persistData();
        if (savedOrderId) onSave({ id: savedOrderId });
    };

    const handleAddOperationClick = async () => {
        const savedOrderId = await persistData();
        if (savedOrderId) addOperation();
    };

    return (
        <div className={styles.page}>
            <div className={styles.container}>
                <div className={styles.header}>
                    <h1 className={styles.title}>{isEditMode ? 'Редактирование заказа' : 'Создание заказа'}</h1>
                    <div className={styles.headerActions}>
                        <button className={styles.cancelButton} onClick={onCancel} disabled={isSaving}>
                            Отмена
                        </button>
                        {isEditMode && (
                            <button className={styles.deleteButton} onClick={handleInitiateOrderDelete} disabled={isSaving}>
                                Удалить
                            </button>
                        )}
                        <button className={styles.saveButton} onClick={handleSaveOrderClick} disabled={isSaving}>
                            {isSaving ? 'Сохранение...' : 'Сохранить заказ'}
                        </button>
                    </div>
                </div>

                <div className={styles.form}>
                    <div className={styles.section}>
                        <label className={styles.label}>Название заказа</label>
                        <input className={styles.input} value={orderTitle} onChange={(e) => setOrderTitle(e.target.value)} />
                    </div>
                    <div className={styles.section}>
                        <label className={styles.label}>Описание</label>
                        <textarea className={styles.textarea} rows={4} value={orderDescription} onChange={(e) => setOrderDescription(e.target.value)} />
                    </div>

                    <div className={styles.operationsSection}>
                        <div className={styles.sectionHeader}>
                            <h2 className={styles.sectionTitle}>Операции</h2>
                            <button className={styles.addOperationButton} onClick={handleAddOperationClick} disabled={isSaving}>
                                {isSaving ? 'Сохранение...' : '+ Добавить операцию'}
                            </button>
                        </div>
                        
                        {operations.length === 0 ? (
                            <div className={styles.emptyState}>Нет операций.</div>
                        ) : (
                            operations.map((op, idx) => (
                                // Оборачиваем карточку в div с ref
                                <div 
                                    key={op.id}
                                    ref={(node) => {
                                        if (node) {
                                            itemsRef.current.set(op.id, node);
                                        } else {
                                            itemsRef.current.delete(op.id);
                                        }
                                    }}
                                    style={{ marginBottom: '16px' }} // Отступ между карточками
                                >

                                    <OperationCard
                                        key={op.id}
                                        index={idx}
                                        operation={op}
                                        orderId={order?.id}
                                        workshops={workshops}
                                        executors={executorsByWorkshop[op.workshopId] || []}
                                        masters={mastersList} // <--- ПЕРЕДАЕМ МАСТЕРОВ
                                        onChange={handleOperationChange}
                                        onTogglePerformer={togglePerformer}
                                        onDeleteInitiate={handleInitiateOpDelete}
                                        onSaveSingle={handleSaveSingleOperation} 
                                        isDirty={checkIsDirty(op)} 
                                    />
                            </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            <DeleteConfirmModal 
                isOpen={isOpDeleteModalOpen}
                itemName={operationToDelete?.name}
                onConfirm={handleConfirmOpDelete}
                onCancel={() => setIsOpDeleteModalOpen(false)}
            />

            <DeleteConfirmModal 
                isOpen={isOrderDeleteModalOpen}
                itemName={`заказ "${orderTitle}"`}
                onConfirm={handleConfirmOrderDelete}
                onCancel={() => setIsOrderDeleteModalOpen(false)}
            />
        </div>
    );
};

export default OrderFormPage;