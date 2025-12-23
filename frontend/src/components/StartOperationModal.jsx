import { useState, useEffect } from 'react';
import { api } from '../api/api';
import styles from './Modal/Modal.module.css';

const StartOperationModal = ({ isOpen, operation, onClose, onConfirm }) => {
    const [workshops, setWorkshops] = useState([]);
    const [executors, setExecutors] = useState([]);
    
    const [selectedWorkshop, setSelectedWorkshop] = useState('');
    const [selectedExecutors, setSelectedExecutors] = useState([]);
    
    // Новое состояние для поиска
    const [searchTerm, setSearchTerm] = useState('');
    
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
            setSearchTerm(''); // Сбрасываем поиск при открытии
        }
    }, [isOpen]);

    // Загрузка исполнителей при выборе цеха
    useEffect(() => {
        if (selectedWorkshop) {
            const loadExecutors = async () => {
                try {
                    const data = await api.refs.getExecutorsByWorkshop(selectedWorkshop);
                    setExecutors(data || []);
                    setSelectedExecutors([]); 
                    setSearchTerm(''); // Сбрасываем поиск при смене цеха
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

    // Фильтрация исполнителей
    const filteredExecutors = executors.filter(ex => 
        ex.full_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

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
                            
                            {/* Поле поиска */}
                            <input 
                                type="text"
                                className={styles.input} // Используем стандартный класс input из стилей модалки
                                placeholder="Поиск по фамилии..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{ marginBottom: '8px' }}
                            />

                            <div style={{ 
                                maxHeight: '150px', 
                                overflowY: 'auto', 
                                border: '1px solid #cbd5f5', 
                                borderRadius: '12px',
                                padding: '8px' 
                            }}>
                                {filteredExecutors.length === 0 ? (
                                    <div style={{color: '#94a3b8', fontSize: '13px', textAlign: 'center', padding: '10px'}}>
                                        {executors.length === 0 ? 'Нет исполнителей в цехе' : 'Ничего не найдено'}
                                    </div>
                                ) : (
                                    filteredExecutors.map(ex => (
                                        <label key={ex.id} style={{display: 'flex', gap: '8px', padding: '4px', fontSize: '14px', cursor: 'pointer', alignItems: 'center'}}>
                                            <input 
                                                type="checkbox" 
                                                checked={selectedExecutors.includes(String(ex.id))}
                                                onChange={() => handleToggleExecutor(ex.id)}
                                                style={{ cursor: 'pointer' }}
                                            />
                                            {ex.full_name}
                                        </label>
                                    ))
                                )}
                            </div>
                            
                            {/* Отображение количества выбранных, если список отфильтрован */}
                            {searchTerm && selectedExecutors.length > 0 && (
                                <div style={{fontSize: '12px', color: '#64748b', marginTop: '4px'}}>
                                    Выбрано всего: {selectedExecutors.length}
                                </div>
                            )}
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