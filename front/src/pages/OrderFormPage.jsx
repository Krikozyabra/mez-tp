import { useState } from 'react';
import styles from './OrderFormPage.module.css';

const formatDateInputValue = (date) => {
  if (!date) return '';
  if (typeof date === 'string') return date;
  return date.toISOString().split('T')[0];
};

const addDays = (date, days) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const addMinutes = (date, minutes) => {
  const next = new Date(date);
  next.setMinutes(next.getMinutes() + minutes);
  return next;
};

// Mock данные для цехов и исполнителей
const WORKSHOPS = [
  { id: '1', name: 'Цех №1' },
  { id: '2', name: 'Цех №2' },
  { id: '3', name: 'Цех №3' },
];

const PERFORMERS = [
  { id: '1', name: 'Иванов И.И.' },
  { id: '2', name: 'Петров П.П.' },
  { id: '3', name: 'Сидоров С.С.' },
  { id: '4', name: 'Козлов К.К.' },
];

const MASTERS = [
  { id: '1', name: 'Мастер 1' },
  { id: '2', name: 'Мастер 2' },
  { id: '3', name: 'Мастер 3' },
];

const OrderFormPage = ({ order, onSave, onCancel, onDelete, allOrders = [] }) => {
  const isEditMode = !!order;
  const [orderTitle, setOrderTitle] = useState(order?.title || '');
  const [orderDescription, setOrderDescription] = useState(order?.description || '');
  const [operations, setOperations] = useState(
    order?.operations?.map(op => ({
      ...op,
      workshopId: op.workshopId || '',
      performerIds: op.performerIds || [],
      priority: op.priority || 'normal',
      durationMinutes: op.durationMinutes || 0,
      needsControl: op.needsControl || false,
      masterId: op.masterId || '',
    })) || []
  );

  // Получить последнюю операцию в цехе для автозаполнения даты
  const getLastOperationInWorkshop = (workshopId) => {
    if (!workshopId) return null;
    
    // Ищем в текущем заказе
    const operationsInWorkshop = operations.filter(op => op.workshopId === workshopId);
    if (operationsInWorkshop.length > 0) {
      const sorted = [...operationsInWorkshop].sort((a, b) => 
        new Date(b.endDate) - new Date(a.endDate)
      );
      return sorted[0];
    }
    
    // Ищем в других заказах
    const allOps = allOrders.flatMap(o => o.operations || []);
    const opsInWorkshop = allOps.filter(op => op.workshopId === workshopId);
    if (opsInWorkshop.length > 0) {
      const sorted = [...opsInWorkshop].sort((a, b) => 
        new Date(b.endDate) - new Date(a.endDate)
      );
      return sorted[0];
    }
    
    return null;
  };

  const handleAddOperation = () => {
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
      workshopId: '',
      performerIds: [],
      priority: 'normal',
      startDate: startDate,
      endDate: endDate,
      durationMinutes: 0,
      needsControl: false,
      masterId: '',
      assignedTo: 'technolog',
    };
    setOperations([...operations, newOperation]);
  };

  const handleRemoveOperation = (operationId) => {
    setOperations(operations.filter(op => op.id !== operationId));
  };

  const handleOperationChange = (operationId, field, value) => {
    setOperations(operations.map(op => {
      if (op.id !== operationId) return op;
      
      const updated = { ...op, [field]: value };
      
      // Если изменился цех, обновляем дату начала
      if (field === 'workshopId' && value) {
        const lastOp = getLastOperationInWorkshop(value);
        if (lastOp) {
          updated.startDate = formatDateInputValue(addDays(new Date(lastOp.endDate), 1));
        }
      }
      
      // Если изменилась длительность, пересчитываем дату окончания
      if (field === 'durationMinutes' && value > 0 && updated.startDate) {
        const start = new Date(updated.startDate);
        const end = addMinutes(start, parseInt(value) || 0);
        updated.endDate = formatDateInputValue(end);
      }
      
      // Если изменилась дата начала и есть длительность, пересчитываем дату окончания
      if (field === 'startDate' && updated.durationMinutes > 0) {
        const start = new Date(value);
        const end = addMinutes(start, updated.durationMinutes);
        updated.endDate = formatDateInputValue(end);
      }
      
      // Если изменилась дата окончания, пересчитываем длительность
      if (field === 'endDate' && updated.startDate) {
        const start = new Date(updated.startDate);
        const end = new Date(value);
        const diffMs = end - start;
        updated.durationMinutes = Math.round(diffMs / (1000 * 60));
      }
      
      return updated;
    }));
  };

  const handleTogglePerformer = (operationId, performerId) => {
    setOperations(operations.map(op => {
      if (op.id !== operationId) return op;
      const performerIds = op.performerIds || [];
      const isSelected = performerIds.includes(performerId);
      return {
        ...op,
        performerIds: isSelected
          ? performerIds.filter(id => id !== performerId)
          : [...performerIds, performerId],
      };
    }));
  };

  const handleSave = () => {
    if (!orderTitle.trim()) {
      alert('Пожалуйста, введите название заказа');
      return;
    }
    
    if (operations.length === 0) {
      alert('Пожалуйста, добавьте хотя бы одну операцию');
      return;
    }
    
    // Валидация операций
    for (const op of operations) {
      if (!op.name.trim()) {
        alert('Пожалуйста, заполните название для всех операций');
        return;
      }
      if (!op.startDate || !op.endDate) {
        alert('Пожалуйста, заполните даты для всех операций');
        return;
      }
      if (new Date(op.endDate) <= new Date(op.startDate)) {
        alert('Дата окончания должна быть позже даты начала для всех операций');
        return;
      }
    }
    
    const orderData = {
      id: order?.id || crypto.randomUUID(),
      title: orderTitle.trim(),
      description: orderDescription.trim(),
      operations: operations.map(op => ({
        id: op.id,
        name: op.name.trim(),
        startDate: op.startDate,
        endDate: op.endDate,
        assignedTo: op.assignedTo,
        workshopId: op.workshopId,
        performerIds: op.performerIds,
        priority: op.priority,
        durationMinutes: op.durationMinutes,
        needsControl: op.needsControl,
        masterId: op.needsControl ? op.masterId : '',
      })),
    };
    
    onSave(orderData);
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>{isEditMode ? 'Редактирование заказа' : 'Создание заказа'}</h1>
          <div className={styles.headerActions}>
            <button className={styles.cancelButton} onClick={onCancel}>
              Отмена
            </button>
            {isEditMode && (
              <button className={styles.deleteButton} onClick={onDelete}>
                Удалить
              </button>
            )}
            <button className={styles.saveButton} onClick={handleSave}>
              Сохранить
            </button>
          </div>
        </div>

        <div className={styles.form}>
          <div className={styles.section}>
            <label className={styles.label}>Название заказа</label>
            <input
              type="text"
              className={styles.input}
              value={orderTitle}
              onChange={(e) => setOrderTitle(e.target.value)}
              placeholder="Введите название заказа"
            />
          </div>

          <div className={styles.section}>
            <label className={styles.label}>Описание</label>
            <textarea
              className={styles.textarea}
              value={orderDescription}
              onChange={(e) => setOrderDescription(e.target.value)}
              placeholder="Введите описание заказа"
              rows={4}
            />
          </div>

          <div className={styles.operationsSection}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Операции</h2>
              <button className={styles.addOperationButton} onClick={handleAddOperation}>
                + Добавить операцию
              </button>
            </div>

            {operations.length === 0 ? (
              <div className={styles.emptyState}>
                Операции не добавлены. Нажмите "Добавить операцию" для создания первой операции.
              </div>
            ) : (
              operations.map((operation, index) => (
                <div key={operation.id} className={styles.operationCard}>
                  <div className={styles.operationHeader}>
                    <h3 className={styles.operationTitle}>Операция {index + 1}</h3>
                    <button
                      className={styles.removeOperationButton}
                      onClick={() => handleRemoveOperation(operation.id)}
                    >
                      Удалить
                    </button>
                  </div>

                  <div className={styles.operationFields}>
                    <div className={styles.fieldRow}>
                      <div className={styles.field}>
                        <label className={styles.fieldLabel}>Название операции</label>
                        <input
                          type="text"
                          className={styles.fieldInput}
                          value={operation.name}
                          onChange={(e) => handleOperationChange(operation.id, 'name', e.target.value)}
                          placeholder="Введите название операции"
                        />
                      </div>

                      <div className={styles.field}>
                        <label className={styles.fieldLabel}>Выбор цеха</label>
                        <select
                          className={styles.fieldSelect}
                          value={operation.workshopId}
                          onChange={(e) => handleOperationChange(operation.id, 'workshopId', e.target.value)}
                        >
                          <option value="">Выберите цех</option>
                          {WORKSHOPS.map(workshop => (
                            <option key={workshop.id} value={workshop.id}>{workshop.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className={styles.field}>
                        <label className={styles.fieldLabel}>Выбор исполнителей (их может быть несколько)</label>
                        <div className={styles.performersList}>
                          {PERFORMERS.map(performer => (
                            <label key={performer.id} className={styles.checkboxLabel}>
                              <input
                                type="checkbox"
                                checked={operation.performerIds?.includes(performer.id) || false}
                                onChange={() => handleTogglePerformer(operation.id, performer.id)}
                              />
                              <span>{performer.name}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className={styles.fieldRow}>
                      <div className={styles.field}>
                        <label className={styles.fieldLabel}>Приоритет</label>
                        <select
                          className={styles.fieldSelect}
                          value={operation.priority}
                          onChange={(e) => handleOperationChange(operation.id, 'priority', e.target.value)}
                        >
                          <option value="low">Низкий</option>
                          <option value="normal">Обычный</option>
                          <option value="high">Высокий</option>
                          <option value="urgent">Срочный</option>
                        </select>
                      </div>

                      <div className={styles.field}>
                        <label className={styles.fieldLabel}>Плановая дата начала</label>
                        <input
                          type="date"
                          className={styles.fieldInput}
                          value={operation.startDate}
                          onChange={(e) => handleOperationChange(operation.id, 'startDate', e.target.value)}
                        />
                      </div>

                      <div className={styles.field}>
                        <label className={styles.fieldLabel}>Плановая дата завершения</label>
                        <input
                          type="date"
                          className={styles.fieldInput}
                          value={operation.endDate}
                          onChange={(e) => handleOperationChange(operation.id, 'endDate', e.target.value)}
                        />
                      </div>

                      <div className={styles.field}>
                        <label className={styles.fieldLabel}>Длительность операции в минутах</label>
                        <input
                          type="number"
                          className={styles.fieldInput}
                          value={operation.durationMinutes || ''}
                          onChange={(e) => handleOperationChange(operation.id, 'durationMinutes', parseInt(e.target.value) || 0)}
                          min="0"
                          placeholder="0"
                        />
                      </div>
                    </div>

                    <div className={styles.fieldRow}>
                      <div className={styles.field}>
                        <label className={styles.checkboxLabel}>
                          <input
                            type="checkbox"
                            checked={operation.needsControl || false}
                            onChange={(e) => handleOperationChange(operation.id, 'needsControl', e.target.checked)}
                          />
                          <span>Нужен ли контроль?</span>
                        </label>
                        {operation.needsControl && (
                          <div className={styles.field} style={{ marginTop: '8px' }}>
                            <label className={styles.fieldLabel}>Если да, то выбираем мастера</label>
                            <select
                              className={styles.fieldSelect}
                              value={operation.masterId}
                              onChange={(e) => handleOperationChange(operation.id, 'masterId', e.target.value)}
                            >
                              <option value="">Выберите мастера</option>
                              {MASTERS.map(master => (
                                <option key={master.id} value={master.id}>{master.name}</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderFormPage;

