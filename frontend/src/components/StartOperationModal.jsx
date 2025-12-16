import { useState, useEffect } from 'react';
import { api } from '../api/api';
import styles from './Modal/Modal.module.css'; // Используем стили обычного Modal

const StartOperationModal = ({ isOpen, operation, onClose, onConfirm }) => {
    const [workshops, setWorkshops] = useState([]);
    const [executors, setExecutors] = useState([]);
    
    const [selectedWorkshop, setSelectedWorkshop] = useState('');
    const [selectedExecutors, setSelectedExecutors] = useState([]);
    const [isLoadingRefs, setIsLoadingRefs] = useState(false);

    // Загрузка цехов при открытии
    useEffect(() => {
        if (isOpen) {
            const loadWorkshops = async () => {
                setIsLoadingRefs(true);
                try {
                    const data = await api.refs.getWorkshops();
                    setWorkshops(data?.results || []);
                } catch (e) {
                    console.error(e);
                } finally {
                    setIsLoadingRefs(false);
                }
            };
            loadWorkshops();
            // Сброс состояния
            setSelectedWorkshop('');
            setSelectedExecutors([]);
        }
    }, [isOpen]);

    // Загрузка исполнителей при выборе цеха
    useEffect(() => {
        if (selectedWorkshop) {
            const loadExecutors = async () => {
                try {
                    const data = await api.refs.getExecutorsByWorkshop(selectedWorkshop);
                    setExecutors(data || []);
                    setSelectedExecutors([]); // Сброс исполнителей при смене цеха
                } catch (e) {
                    console.error(e);
                }
            };
            loadExecutors();
        } else {
            setExecutors([]);
        }
    }, [selectedWorkshop]);

    const handleToggleExecutor = (id) => {
        const strId = String(id);
        setSelectedExecutors(prev => 
            prev.includes(strId) 
                ? prev.filter(x => x !== strId) 
                : [...prev, strId]
        );
    };

    const handleSubmit = () => {
        if (!selectedWorkshop || selectedExecutors.length === 0) return;
        onConfirm(operation.id, selectedWorkshop, selectedExecutors);
    };

    if (!isOpen) return null;

    return (
        <div className={styles.backdrop} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div className={styles.header}>
                    <span>Запуск операции: {operation.name}</span>
                    <button className={styles.closeButton} onClick={onClose}>×</button>
                </div>
                
                <div className={styles.content}>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Выберите цех</label>
                        <select 
                            className={styles.select}
                            value={selectedWorkshop}
                            onChange={e => setSelectedWorkshop(e.target.value)}
                            disabled={isLoadingRefs}
                        >
                            <option value="">-- Цех --</option>
                            {workshops.map(w => (
                                <option key={w.id} value={w.id}>{w.name}</option>
                            ))}
                        </select>
                    </div>

                    {selectedWorkshop && (
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Выберите исполнителей</label>
                            <div style={{ 
                                maxHeight: '150px', 
                                overflowY: 'auto', 
                                border: '1px solid #cbd5f5', 
                                borderRadius: '12px',
                                padding: '8px' 
                            }}>
                                {executors.length === 0 ? (
                                    <div style={{color: '#94a3b8', fontSize: '13px'}}>Нет исполнителей</div>
                                ) : (
                                    executors.map(ex => (
                                        <label key={ex.id} style={{display: 'flex', gap: '8px', padding: '4px', fontSize: '14px', cursor: 'pointer'}}>
                                            <input 
                                                type="checkbox" 
                                                checked={selectedExecutors.includes(String(ex.id))}
                                                onChange={() => handleToggleExecutor(ex.id)}
                                            />
                                            {ex.full_name}
                                        </label>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className={styles.actions}>
                    <button className={`${styles.button} ${styles.secondary}`} onClick={onClose}>
                        Отмена
                    </button>
                    <button 
                        className={`${styles.button} ${styles.primary}`} 
                        onClick={handleSubmit}
                        disabled={!selectedWorkshop || selectedExecutors.length === 0}
                    >
                        Начать работу
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StartOperationModal;