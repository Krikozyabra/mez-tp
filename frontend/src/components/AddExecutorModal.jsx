import { useState, useEffect } from 'react';
import { api } from '../api/api';
import styles from './AddExecutorModal.module.css';

const AddExecutorModal = ({ onClose }) => {
    const [fullName, setFullName] = useState('');
    
    // Списки для Dual Listbox
    const [allWorkshops, setAllWorkshops] = useState([]); // Исходные данные
    const [available, setAvailable] = useState([]);       // Левая колонка
    const [selected, setSelected] = useState([]);         // Правая колонка

    const [isSubmitting, setIsSubmitting] = useState(false);

    // Загрузка цехов при открытии
    useEffect(() => {
        const fetchWorkshops = async () => {
            try {
                const data = await api.refs.getWorkshops();
                const list = data.results || data || [];
                setAllWorkshops(list);
                setAvailable(list); // Сначала все доступны
            } catch (error) {
                console.error("Ошибка загрузки цехов:", error);
            }
        };
        fetchWorkshops();
    }, []);

    // Закрытие по Esc
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    // Перенос элемента из одной колонки в другую
    const moveToSelected = (item) => {
        setAvailable(prev => prev.filter(i => i.id !== item.id));
        setSelected(prev => [...prev, item]);
    };

    const moveToAvailable = (item) => {
        setSelected(prev => prev.filter(i => i.id !== item.id));
        setAvailable(prev => [...prev, item]);
    };

    // Общая функция отправки
    const handleSubmit = async (shouldClose) => {
        if (!fullName.trim()) {
            alert('Введите ФИО');
            return;
        }
        if (selected.length === 0) {
            alert('Выберите хотя бы один цех');
            return;
        }

        setIsSubmitting(true);
        try {
            const payload = {
                full_name: fullName,
                assembly_shops: selected.map(w => w.id)
            };

            await api.refs.createExecutor(payload);
            
            alert('Исполнитель добавлен успешно!');

            if (shouldClose) {
                onClose();
            } else {
                // Сброс формы для следующего добавления
                setFullName('');
                setSelected([]);
                setAvailable(allWorkshops); // Возвращаем все в левую колонку
            }
        } catch (error) {
            console.error(error);
            alert('Ошибка при сохранении: ' + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className={styles.backdrop} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div className={styles.header}>
                    <span>Добавить исполнителя</span>
                    <button className={styles.closeButton} onClick={onClose}>×</button>
                </div>
                
                <div className={styles.content}>
                    {/* ФИО */}
                    <div className={styles.formGroup}>
                        <label className={styles.label}>ФИО <span style={{color:'red'}}>*</span></label>
                        <input
                            className={styles.input}
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="Иванов Иван Иванович"
                            autoFocus
                        />
                    </div>

                    {/* Выбор цехов (Dual Listbox) */}
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Выбор цехов <span style={{color:'red'}}>*</span></label>
                        
                        <div className={styles.dualListContainer}>
                            {/* Левая колонка: Доступные */}
                            <div className={styles.listColumn}>
                                <div className={styles.columnHeader}>Доступные ({available.length})</div>
                                <div className={styles.listBody}>
                                    {available.map(shop => (
                                        <div 
                                            key={shop.id} 
                                            className={styles.listItem}
                                            onClick={() => moveToSelected(shop)}
                                            title="Нажмите, чтобы добавить"
                                        >
                                            {shop.name} →
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Разделитель / Стрелки (визуально) */}
                            <div className={styles.controls}>
                                <div className={styles.moveButton}>⇄</div>
                            </div>

                            {/* Правая колонка: Выбранные */}
                            <div className={styles.listColumn} style={{borderColor: '#3b82f6'}}>
                                <div className={styles.columnHeader} style={{color: '#3b82f6'}}>Выбранные ({selected.length})</div>
                                <div className={styles.listBody}>
                                    {selected.map(shop => (
                                        <div 
                                            key={shop.id} 
                                            className={styles.listItem}
                                            onClick={() => moveToAvailable(shop)}
                                            title="Нажмите, чтобы убрать"
                                        >
                                            ← {shop.name}
                                        </div>
                                    ))}
                                    {selected.length === 0 && (
                                        <div style={{padding: '10px', color: '#94a3b8', fontSize: '13px', textAlign:'center'}}>
                                            Список пуст
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className={styles.actions}>
                    <button 
                        className={`${styles.button} ${styles.secondary}`} 
                        onClick={onClose}
                        disabled={isSubmitting}
                    >
                        Отмена
                    </button>
                    
                    <button 
                        className={`${styles.button} ${styles.primaryOutline}`} 
                        onClick={() => handleSubmit(false)}
                        disabled={isSubmitting}
                    >
                        Добавить и к следующему
                    </button>

                    <button 
                        className={`${styles.button} ${styles.primary}`} 
                        onClick={() => handleSubmit(true)}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? 'Сохранение...' : 'Добавить и закрыть'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddExecutorModal;