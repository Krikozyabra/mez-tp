import { memo } from 'react';
import styles from '../pages/OrderFormPage.module.css';

const OperationCard = ({ 
    operation, 
    index,
    masters = [], 
    otherOperations = [], 
    onChange, 
    onDeleteInitiate, 
    onSaveSingle,
    isDirty
}) => {
    const isCompleted = !!operation.actualEnd;
    const hasDependency = !!operation.previousOperationId;

    const safeOtherOperations = otherOperations || [];
    // Исключаем себя и исключаем тех, кто ссылается на нас (чтобы избежать прямых циклов в UI)
    const availableParents = safeOtherOperations.filter(op => 
        op.id !== operation.id && op.previousOperationId !== String(operation.id)
    );

    return (
        <div className={styles.operationCard}>
            {/* Header ... без изменений */}
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
                        <label className={styles.fieldLabel}>Название</label>
                        <input
                            type="text"
                            className={styles.fieldInput}
                            value={operation.name}
                            onChange={(e) => onChange(operation.id, 'name', e.target.value)}
                            disabled={isCompleted}
                        />
                    </div>
                    
                    {/* Select Зависимости */}
                    <div className={styles.field}>
                        <label className={styles.fieldLabel}>Зависит от</label>
                        <select
                            className={styles.fieldSelect}
                            value={operation.previousOperationId || ""}
                            onChange={(e) => onChange(operation.id, 'previousOperationId', e.target.value)}
                            disabled={isCompleted}
                            style={{borderColor: '#3b82f6', background: '#eff6ff'}}
                        >
                            <option value="">-- Нет (Старт 08:00) --</option>
                            {availableParents.map(op => (
                                <option key={op.id} value={op.id}>
                                    {op.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className={styles.fieldRow}>
                    {/* Плановое начало: ДАТА + ВРЕМЯ */}
                    <div className={styles.field}>
                        <label className={styles.fieldLabel}>Начало</label>
                        <div style={{display: 'flex', gap: '8px'}}>
                            <input
                                type="date"
                                className={styles.fieldInput}
                                value={operation.startDate}
                                onChange={(e) => onChange(operation.id, 'startDate', e.target.value)}
                                disabled={isCompleted || hasDependency}
                                style={{flex: 2}}
                            />
                            <input
                                type="time"
                                className={styles.fieldInput}
                                value={operation.startTime}
                                onChange={(e) => onChange(operation.id, 'startTime', e.target.value)}
                                disabled={isCompleted || hasDependency}
                                style={{flex: 1}}
                            />
                        </div>
                    </div>

                    {/* Плановое завершение: ДАТА + ВРЕМЯ */}
                    <div className={styles.field}>
                        <label className={styles.fieldLabel}>Завершение</label>
                        <div style={{display: 'flex', gap: '8px'}}>
                            <input
                                type="date"
                                className={styles.fieldInput}
                                value={operation.endDate}
                                onChange={(e) => onChange(operation.id, 'endDate', e.target.value)}
                                disabled={isCompleted}
                                style={{flex: 2}}
                            />
                            <input
                                type="time"
                                className={styles.fieldInput}
                                value={operation.endTime}
                                onChange={(e) => onChange(operation.id, 'endTime', e.target.value)}
                                disabled={isCompleted}
                                style={{flex: 1}}
                            />
                        </div>
                    </div>
                    
                    {/* Длительность */}
                    <div className={styles.field} style={{maxWidth: '100px'}}>
                        <label className={styles.fieldLabel}>Мин.</label>
                        <input
                            type="number"
                            className={styles.fieldInput}
                            value={operation.durationMinutes || ''}
                            onChange={(e) => onChange(operation.id, 'durationMinutes', e.target.value)}
                            min="0"
                            disabled={isCompleted}
                        />
                    </div>
                </div>
                {hasDependency && (
                            <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
                                Начало определяется предыдущей операцией
                            </div>
                        )}
                <div className={styles.fieldRow}>
                    <div className={styles.field}>
                        <label className={styles.fieldLabel}>Мастер</label>
                        <select
                            className={styles.fieldSelect}
                            value={operation.masterId || ""}
                            onChange={(e) => onChange(operation.id, 'masterId', e.target.value)}
                            disabled={isCompleted}
                        >
                            <option value="">Технолог</option>
                            {masters?.map(m => (
                                <option key={m.id} value={m.id}>
                                    {m.full_name || m.username}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className={styles.field}>
                        <label className={styles.fieldLabel}>Описание</label>
                        <input
                            type="text"
                            className={styles.fieldInput}
                            value={operation.description}
                            onChange={(e) => onChange(operation.id, 'description', e.target.value)}
                            disabled={isCompleted}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default memo(OperationCard);