import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../api/api';
import { useOrderOperations } from '../hooks/useOrderOperations';
import { mapOperationToBackend, mapBackendDetailToForm } from '../utils/mappers';
import OperationCard from '../components/OperationCard';
import DeleteConfirmModal from '../components/DeleteConfirmModal';
import styles from './OrderFormPage.module.css';

const OrderFormPage = ({ order, onSave, onCancel, onDelete, focusOperationId }) => {
    const isEditMode = !!order;
    
    const [orderTitle, setOrderTitle] = useState(order?.title || '');
    const [orderDescription, setOrderDescription] = useState(order?.description || '');
    const [orderDeadline, setOrderDeadline] = useState(order?.deadline || '');
    const [defaultMasterId, setDefaultMasterId] = useState(order?.defaultMasterId || '');

    const [mastersList, setMastersList] = useState([]);
    const [isSaving, setIsSaving] = useState(false);
    
    const [originalOperations, setOriginalOperations] = useState([]);

    const [isOpDeleteModalOpen, setIsOpDeleteModalOpen] = useState(false);
    const [isOrderDeleteModalOpen, setIsOrderDeleteModalOpen] = useState(false);
    const [operationToDelete, setOperationToDelete] = useState(null);

    const { 
        operations, 
        setOperations,
        addOperation, 
        removeOperation, 
        updateOperation,
    } = useOrderOperations(order?.operations || []);

    // --- 1. ОБРАБОТКА НАЖАТИЯ ESC ---
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                onCancel();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onCancel]);

    // --- СИНХРОНИЗАЦИЯ ---
    useEffect(() => {
        if (order) {
            setOrderTitle(order.title || '');
            setOrderDescription(order.description || '');
            setOrderDeadline(order.deadline || '');
            setDefaultMasterId(order.defaultMasterId ? String(order.defaultMasterId) : '');
            
            if (order.operations) {
                // 1. Создаем глубокую копию для сравнения изменений
                setOriginalOperations(JSON.parse(JSON.stringify(order.operations)));
                
                // 2. !!! ОБНОВЛЯЕМ ТЕКУЩИЙ СТЕЙТ ОПЕРАЦИЙ !!!
                // Это гарантирует, что previousOperationId, рассчитанный в mappers.js,
                // попадет в список operations и отобразится в select.
                setOperations(order.operations);
            }
        }
    }, [order, setOperations]);

    // --- Загрузка мастеров ---
    useEffect(() => {
        const loadMasters = async () => {
            try {
                const data = await api.refs.getMasters();
                setMastersList(data?.results || []);
            } catch (err) { console.error(err); } 
        };
        loadMasters();
    }, []);

    // ... (Скролл и обработчики без изменений) ...
    const itemsRef = useRef(new Map());
    const hasScrolledRef = useRef(false);
    useEffect(() => { hasScrolledRef.current = false; }, [focusOperationId]);
    useEffect(() => {
        if (focusOperationId && operations.length > 0 && !hasScrolledRef.current) {
            const node = itemsRef.current.get(focusOperationId);
            if (node) {
                hasScrolledRef.current = true;
                setTimeout(() => {
                    node.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    node.style.boxShadow = '0 0 0 2px #3b82f6, 0 0 15px rgba(59, 130, 246, 0.3)';
                    node.style.transition = 'box-shadow 0.5s';
                    setTimeout(() => node.style.boxShadow = 'none', 2000);
                }, 100);
            }
        }
    }, [focusOperationId, operations]);

    const handleOperationChange = async (opId, field, value) => {
        updateOperation(opId, field, value);
    };

    const checkIsDirty = (currentOp) => {
        const original = originalOperations.find(op => op.id === currentOp.id);
        if (!original) return true;
        return JSON.stringify(currentOp) !== JSON.stringify(original);
    };

    const handleInitiateOpDelete = (op) => { setOperationToDelete(op); setIsOpDeleteModalOpen(true); };
    const handleConfirmOpDelete = async () => {
        if (!operationToDelete) return;
        const isLocal = typeof operationToDelete.id === 'string' && operationToDelete.id.length > 20;
        if (!isLocal) {
            try { await api.operations.delete(operationToDelete.id); } 
            catch (error) { console.error(error); alert('Ошибка удаления'); return; }
        }
        removeOperation(operationToDelete.id);
        setIsOpDeleteModalOpen(false); setOperationToDelete(null);
    };
    const handleInitiateOrderDelete = () => setIsOrderDeleteModalOpen(true);
    const handleConfirmOrderDelete = async () => {
        if (!order?.id) return;
        try { await api.orders.delete(order.id); if (onDelete) onDelete(); } 
        catch (error) { console.error(error); alert('Ошибка удаления'); } 
        finally { setIsOrderDeleteModalOpen(false); }
    };

    // --- ОДИНОЧНОЕ СОХРАНЕНИЕ ---
    const handleSaveSingleOperation = async (operation) => {
        if (!operation.name.trim()) return alert('Введите название');
        if (!operation.startDate || !operation.endDate) return alert('Заполните даты');

        let orderId = order?.id;
        const isNewOrderOnBackend = typeof orderId === 'string' && orderId.length > 20;
        if (isNewOrderOnBackend) return alert('Сначала сохраните заказ целиком.');

        // --- ЛОГИКА ПРОВЕРКИ ЗАВИСИМОСТЕЙ ---
        let changedDependenciesCount = 0;
        
        operations.forEach(op => {
            const original = originalOperations.find(orig => orig.id === op.id);
            // Проверяем, изменилось ли поле previousOperationId
            // Сравниваем строки, чтобы избежать проблем с типами
            const oldPrev = original ? String(original.previousOperationId || '') : '';
            const newPrev = String(op.previousOperationId || '');
            
            if (oldPrev !== newPrev) {
                changedDependenciesCount++;
            }
        });

        // Если изменено более одной связи, запрещаем одиночное сохранение
        if (changedDependenciesCount > 1) {
            alert("Вы изменили связи (поле 'Зависит от') у нескольких операций.\n\nПожалуйста, используйте кнопку 'Сохранить всё' (вверху страницы), чтобы корректно обновить структуру заказа.");
            return;
        }
        // -------------------------------------

        try {
            const idx = operations.findIndex(op => op.id === operation.id);
            const payload = mapOperationToBackend(operation, orderId, idx);
            const isOpNew = typeof operation.id === 'string' && operation.id.length > 20;
            
            const savedOpData = isOpNew 
                ? await api.operations.create(payload) 
                : await api.operations.update(operation.id, payload);

            const updatedOp = { ...operation, id: savedOpData.id };
            
            // Если у текущей операции изменилась зависимость, нужно обновить связь на бэкенде
            // (Так как mapOperationToBackend посылает next_operation: null)
            // Это сложный момент для одиночного сохранения. 
            // Если зависимость была изменена ТОЛЬКО у этой операции, попробуем обновить связь.
            const originalOp = originalOperations.find(o => o.id === operation.id);
            const oldPrev = originalOp ? String(originalOp.previousOperationId || '') : '';
            const newPrev = String(operation.previousOperationId || '');

            if (oldPrev !== newPrev && newPrev) {
                 // Находим ту операцию, которая теперь должна ссылаться на эту (или наоборот).
                 // Логика next_operation подразумевает: "Эта операция является следующей для..."
                 // В нашей модели: OpA.next_operation = OpB (значит OpB зависит от OpA).
                 // previousOperationId = ID OpA.
                 // Значит нам нужно найти OpA (newPrev) и поставить ей next_operation = savedOpData.id
                 
                 // Простая попытка линковки для одиночного сохранения:
                 await api.operations.update(newPrev, { next_operation: savedOpData.id });
            }

            setOperations(prev => prev.map(op => op.id === operation.id ? updatedOp : op));
            setOriginalOperations(prev => {
                const filtered = prev.filter(op => op.id !== operation.id);
                return [...filtered, updatedOp];
            });
            alert('Операция сохранена!');
        } catch (e) { console.error(e); alert('Ошибка сохранения: ' + e.message); }
    };

    // --- ГЛАВНОЕ СОХРАНЕНИЕ ---
    const persistData = async () => {
        if (!orderTitle.trim()) { alert('Введите название заказа'); return false; }
        if (!orderDeadline) { alert('Укажите Дедлайн заказа'); return false; }

        setIsSaving(true);
        try {
            let orderId = order?.id;
            const isNewOrderOnBackend = typeof orderId === 'string' && orderId.length > 20; 

            // 1. Сохраняем Заказ
            const orderPayload = {
                title: orderTitle,
                description: orderDescription,
                deadline: orderDeadline,
                defaultMasterId: defaultMasterId || null
            };

            if (isNewOrderOnBackend) {
                const createdOrder = await api.orders.create(orderPayload);
                orderId = createdOrder.id;
            } else {
                await api.orders.update(orderId, orderPayload);
            }

            // 2. Сохраняем операции
            const idMap = {}; 
            const savedOperations = [];

            const oldDefaultMaster = order?.defaultMasterId ? String(order.defaultMasterId) : '';
            const newDefaultMaster = defaultMasterId ? String(defaultMasterId) : '';
            const isMasterChanged = oldDefaultMaster !== newDefaultMaster;

            for (let i = 0; i < operations.length; i++) {
                const op = operations[i];
                let payload = mapOperationToBackend(op, orderId, i);
                
                if (isMasterChanged || isNewOrderOnBackend) {
                    if (defaultMasterId) {
                        payload.master = parseInt(defaultMasterId);
                        payload.needs_master_check = true;
                    } else {
                        payload.master = null;
                        payload.needs_master_check = false;
                    }
                }
                
                const isOpNew = typeof op.id === 'string' && op.id.length > 20;
                let savedOp;
                if (isOpNew) {
                    savedOp = await api.operations.create(payload);
                } else {
                    savedOp = await api.operations.update(op.id, payload);
                }
                
                idMap[op.id] = savedOp.id;
                
                savedOperations.push({
                    ...savedOp,
                    _ui_previousOperationId: op.previousOperationId 
                });
            }

            // 3. Линковка (Linked List)
            // Сначала всем сбрасываем next_operation (чтобы избежать конфликтов unique), 
            // если бы мы меняли порядок, но для упрощения просто перезаписываем.
            // Но в идеале:
            // 1. Проход: next_operation = null для всех
            // 2. Проход: проставить правильные next_operation
            
            // Простой вариант (простановка):
            for (const currentOp of savedOperations) {
                const prevUiId = currentOp._ui_previousOperationId;
                if (prevUiId) {
                    const prevRealId = idMap[prevUiId] || prevUiId;
                    if (prevRealId) {
                        await api.operations.update(prevRealId, { 
                            next_operation: currentOp.id 
                        });
                    }
                }
            }

            // 4. Обновляем UI
            const updatedOrderData = await api.orders.getOne(orderId);
            const formFormat = mapBackendDetailToForm(updatedOrderData);
            
            setOperations(formFormat.operations);
            setOriginalOperations(JSON.parse(JSON.stringify(formFormat.operations)));

            return orderId;
        } catch (error) {
            console.error("Save error:", error);
            alert("Ошибка сохранения: " + error.message);
            return false;
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveOrderClick = async () => {
        const savedOrderId = await persistData();
        if (savedOrderId) {
            // === ИЗМЕНЕНИЕ: Не вызываем onSave(), чтобы не закрывать окно ===
            // onSave({ id: savedOrderId }); 
            alert('Заказ и все операции успешно сохранены!');
        }
    };

    const handleAddOperationClick = async () => {
        if (typeof order?.id === 'string' && order.id.length > 20) {
             const saved = await persistData();
             if (saved) addOperation();
        } else {
            addOperation();
        }
    };

    return (
        <div className={styles.page}>
            <div className={styles.container}>
                <div className={styles.header}>
                    <h1 className={styles.title}>{isEditMode ? 'Редактирование заказа' : 'Новый заказ'}</h1>
                    <div className={styles.headerActions}>
                        <button className={styles.cancelButton} onClick={onCancel}>Закрыть (Esc)</button>
                        {isEditMode && <button className={styles.deleteButton} onClick={handleInitiateOrderDelete}>Удалить</button>}
                        <button className={styles.saveButton} onClick={handleSaveOrderClick} disabled={isSaving}>
                            {isSaving ? 'Сохранение...' : 'Сохранить всё'}
                        </button>
                    </div>
                </div>

                <div className={styles.form}>
                    <div className={styles.fieldRow} style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px'}}>
                        <div className={styles.section}>
                            <label className={styles.label}>Название заказа <span style={{color: 'red'}}>*</span></label>
                            <input className={styles.input} value={orderTitle} onChange={e => setOrderTitle(e.target.value)} />
                        </div>
                        <div className={styles.section}>
                            <label className={styles.label}>Дедлайн <span style={{color: 'red'}}>*</span></label>
                            <input type="date" className={styles.input} value={orderDeadline} onChange={e => setOrderDeadline(e.target.value)} />
                        </div>
                    </div>
                    
                    <div className={styles.section}>
                        <label className={styles.label}>Описание</label>
                        <textarea className={styles.textarea} rows={2} value={orderDescription} onChange={e => setOrderDescription(e.target.value)} />
                    </div>

                    <div className={styles.section}>
                         <label className={styles.label}>Мастер по умолчанию</label>
                         <select className={styles.input} value={defaultMasterId} onChange={e => setDefaultMasterId(e.target.value)}>
                            <option value="">-- Не назначен --</option>
                            {mastersList.map(m => <option key={m.id} value={m.id}>{m.full_name || m.username}</option>)}
                         </select>
                    </div>

                    <div className={styles.operationsSection}>
                        <div className={styles.sectionHeader}>
                            <h2 className={styles.sectionTitle}>Технологический процесс</h2>
                            <button className={styles.addOperationButton} onClick={handleAddOperationClick} disabled={isSaving}>
                                + Добавить этап
                            </button>
                        </div>
                        
                        {operations.length === 0 ? <div className={styles.emptyState}>Нет операций</div> : (
                            operations.map((op, idx) => (
                                <div key={op.id} ref={node => node ? itemsRef.current.set(op.id, node) : itemsRef.current.delete(op.id)} style={{ marginBottom: '16px' }}>
                                    <OperationCard
                                        index={idx}
                                        operation={op}
                                        orderId={order?.id}
                                        masters={mastersList}
                                        otherOperations={operations} 
                                        onChange={handleOperationChange}
                                        onDeleteInitiate={handleInitiateOpDelete}
                                        onSaveSingle={(op) => handleSaveSingleOperation(op, idx)} 
                                        isDirty={checkIsDirty(op)} 
                                    />
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
            
            <DeleteConfirmModal isOpen={isOpDeleteModalOpen} itemName={operationToDelete?.name} onConfirm={handleConfirmOpDelete} onCancel={() => setIsOpDeleteModalOpen(false)} />
            <DeleteConfirmModal isOpen={isOrderDeleteModalOpen} itemName={`заказ "${orderTitle}"`} onConfirm={handleConfirmOrderDelete} onCancel={() => setIsOrderDeleteModalOpen(false)} />
        </div>
    );
};

export default OrderFormPage;