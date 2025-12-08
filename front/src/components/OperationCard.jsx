import React, { memo } from 'react';
import styles from '../pages/OrderFormPage.module.css';

const OperationCard = ({ 
    operation, 
    index,
    workshops, 
    executors, 
    masters, // <--- Получаем список мастеров
    onChange, 
    onTogglePerformer,
    onDeleteInitiate, 
    onSaveSingle
}) => {

    return (
        <div className={styles.operationCard}>
            <div className={styles.operationHeader}>
                <h3 className={styles.operationTitle}>Операция {index + 1}</h3>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        className={styles.saveButton}
                        style={{ padding: '8px 16px', fontSize: '13px' }}
                        onClick={() => onSaveSingle(operation)}
                    >
                        Сохранить операцию
                    </button>
                    <button
                        className={styles.removeOperationButton}
                        onClick={() => onDeleteInitiate(operation)}
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
                        />
                    </div>
                    <div className={styles.field}>
                        <label className={styles.fieldLabel}>Описание операции</label>
                        <input
                            type="text"
                            className={styles.fieldInput}
                            value={operation.description}
                            onChange={(e) => onChange(operation.id, 'description', e.target.value)}
                        />
                    </div>
                    <div className={styles.field}>
                        <label className={styles.fieldLabel}>Цех</label>
                        <select
                            className={styles.fieldSelect}
                            value={operation.workshopId}
                            onChange={(e) => onChange(operation.id, 'workshopId', e.target.value)}
                        >
                            <option value="">Выберите цех</option>
                            {workshops.map(w => (
                                <option key={w.id} value={w.id}>{w.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className={styles.fieldRow}>
                    <div className={styles.field}>
                        <label className={styles.fieldLabel}>Исполнители</label>
                        <div className={styles.performersList}>
                            {executors.map(performer => (
                                <label key={performer.id} className={styles.checkboxLabel}>
                                    <input
                                        type="checkbox"
                                        checked={operation.performerIds?.map(String).includes(String(performer.id)) || false}
                                        onChange={() => onTogglePerformer(operation.id, performer.id)}
                                    />
                                    <span>{performer.full_name}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                    <div className={styles.field}>
                        <label className={styles.fieldLabel}>Приоритет</label>
                        <input
                            type="number"
                            className={styles.fieldInput}
                            value={operation.priority}
                            onChange={(e) => onChange(operation.id, 'priority', e.target.value)}
                            min="1"
                            placeholder="1"
                        />
                    </div>
                    <div className={styles.field}>
                        <label className={styles.fieldLabel}>Начало</label>
                        <input
                            type="date"
                            className={styles.fieldInput}
                            value={operation.startDate}
                            onChange={(e) => onChange(operation.id, 'startDate', e.target.value)}
                        />
                    </div>
                    <div className={styles.field}>
                        <label className={styles.fieldLabel}>Завершение</label>
                        <input
                            type="date"
                            className={styles.fieldInput}
                            value={operation.endDate}
                            onChange={(e) => onChange(operation.id, 'endDate', e.target.value)}
                        />
                    </div>
                    <div className={styles.field}>
                        <label className={styles.fieldLabel}>Минуты (авто)</label>
                        <input
                            type="number"
                            className={styles.fieldInput}
                            value={operation.durationMinutes || ''}
                            onChange={(e) => onChange(operation.id, 'durationMinutes', e.target.value)}
                            min="0"
                        />
                    </div>
                </div>

                <div className={styles.fieldRow}>
                    <div className={styles.field}>
                        <label className={styles.checkboxLabel}>
                            <input
                                type="checkbox"
                                checked={operation.needsControl || false}
                                onChange={(e) => onChange(operation.id, 'needsControl', e.target.checked)}
                            />
                            <span>Нужен контроль?</span>
                        </label>
                        {operation.needsControl && (
                            <div className={styles.field} style={{ marginTop: '8px' }}>
                                <label className={styles.fieldLabel}>Выберите мастера</label>
                                <select
                                    className={styles.fieldSelect}
                                    value={operation.masterId}
                                    onChange={(e) => onChange(operation.id, 'masterId', e.target.value)}
                                >
                                    <option value="">-- Не назначен --</option>
                                    {masters && masters.map(m => (
                                        <option key={m.id} value={m.id}>
                                            {m.full_name || m.username}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default memo(OperationCard);