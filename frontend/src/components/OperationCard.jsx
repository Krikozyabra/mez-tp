import React, { memo } from 'react';
import styles from '../pages/OrderFormPage.module.css';

const OperationCard = ({ 
    operation, 
    index,
    // Добавляем значения по умолчанию, чтобы избежать undefined.map
    masters = [], 
    otherOperations = [], 
    onChange, 
    onDeleteInitiate, 
    onSaveSingle,
    isDirty
}) => {
    const isCompleted = !!operation.actualEnd;
    
    // Защита: если otherOperations вдруг придет null/undefined, используем пустой массив
    const safeOtherOperations = otherOperations || [];
    
    // Фильтруем список: исключаем саму себя из списка родителей
    const availableParents = safeOtherOperations.filter(op => op.id !== operation.id);

    return (
        <div className={styles.operationCard}>
            <div className={styles.operationHeader}>
                <h3 className={styles.operationTitle}>
                    Этап {index + 1}
                    {isDirty && <span style={{color: '#f59e0b', marginLeft: '8px', fontSize: '12px'}}>● Изменено</span>}
                    {isCompleted && <span style={{color: 'green', marginLeft: '8px', fontSize: '12px'}}>(Выполнено)</span>}
                </h3>
                
                <div style={{ display: 'flex', gap: '8px' }}>
                    {isDirty && (
                        <button className={styles.saveButton} onClick={() => onSaveSingle(operation)}>
                            Сохранить
                        </button>
                    )}
                    <button
                        className={styles.removeOperationButton}
                        onClick={() => onDeleteInitiate(operation)}
                        disabled={isCompleted}
                    >
                        Удалить
                    </button>
                </div>
            </div>

            <div className={styles.operationFields}>
                <div className={styles.fieldRow}>
                    <div className={styles.field}>
                        <label className={styles.fieldLabel}>Название операции</label>
                        <input
                            type="text"
                            className={styles.fieldInput}
                            value={operation.name}
                            onChange={(e) => onChange(operation.id, 'name', e.target.value)}
                            disabled={isCompleted}
                        />
                    </div>
                    <div className={styles.field}>
                        <label className={styles.fieldLabel}>Описание операции</label>
                        <input
                            type="text"
                            className={styles.fieldInput}
                            value={operation.description}
                            onChange={(e) => onChange(operation.id, 'description', e.target.value)}
                            disabled={isCompleted}
                        />
                    </div>
                    
                    {/* Выбор зависимости (Предыдущая операция) */}
                    <div className={styles.field}>
                        <label className={styles.fieldLabel}>Зависит от (предыдущий этап)</label>
                        <select
                            className={styles.fieldSelect}
                            value={operation.previousOperationId || ""}
                            onChange={(e) => onChange(operation.id, 'previousOperationId', e.target.value)}
                            disabled={isCompleted}
                            style={{borderColor: '#3b82f6', background: '#eff6ff'}}
                        >
                            <option value="">-- Нет (Параллельно / Первая) --</option>
                            {/* Используем безопасный массив с проверкой ?. */}
                            {availableParents?.map(op => (
                                <option key={op.id} value={op.id}>
                                    {op.name} {String(op.id).length < 10 ? `(#${op.id})` : '(нов.)'}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className={styles.fieldRow}>
                    <div className={styles.field}>
                        <label className={styles.fieldLabel}>Плановое начало</label>
                        <input
                            type="date"
                            className={styles.fieldInput}
                            value={operation.startDate}
                            onChange={(e) => onChange(operation.id, 'startDate', e.target.value)}
                            disabled={isCompleted}
                        />
                    </div>
                    <div className={styles.field}>
                        <label className={styles.fieldLabel}>Плановое завершение</label>
                        <input
                            type="date"
                            className={styles.fieldInput}
                            value={operation.endDate}
                            onChange={(e) => onChange(operation.id, 'endDate', e.target.value)}
                            disabled={isCompleted}
                        />
                    </div>
                    
                    <div className={styles.field}>
                        <label className={styles.fieldLabel}>Ответственный / Контроль</label>
                        <select
                            className={styles.fieldSelect}
                            value={operation.masterId || ""}
                            onChange={(e) => onChange(operation.id, 'masterId', e.target.value)}
                            disabled={isCompleted}
                        >
                            <option value="">Технолог</option>
                            {/* Добавлена проверка masters?.map */}
                            {masters?.map(m => (
                                <option key={m.id} value={m.id}>
                                    {m.full_name || m.username}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default memo(OperationCard);