import { useState, useEffect } from 'react';
import { api } from '../api/api';
import styles from './Modal/Modal.module.css';

const AddWorkshopModal = ({ onClose, onSuccess }) => {
    const [text, setText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Закрытие по Esc
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const handleSubmit = async () => {
        if (!text.trim()) return;

        // Разбиваем текст по переносу строки и убираем пустые строки
        const names = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);

        if (names.length === 0) {
            alert('Введите хотя бы одно название');
            return;
        }

        setIsSubmitting(true);
        try {
            // Отправляем запросы последовательно (или Promise.all для параллельности)
            // Последовательно безопаснее для порядка, если он важен, но здесь не критично.
            // Используем Promise.all для скорости.
            await Promise.all(names.map(name => api.refs.createWorkshop(name)));
            
            alert(`Успешно добавлено цехов: ${names.length}`);
            if (onSuccess) onSuccess(); // Коллбек для обновления данных на родительской странице если нужно
            onClose();
        } catch (error) {
            console.error(error);
            alert('Ошибка при добавлении: ' + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className={styles.backdrop} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div className={styles.header}>
                    <span>Добавление цехов</span>
                    <button className={styles.closeButton} onClick={onClose}>×</button>
                </div>
                
                <div className={styles.content}>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Названия (каждый с новой строки)</label>
                        <textarea
                            className={styles.input} // Используем класс input для стиля границ
                            style={{ minHeight: '150px', resize: 'vertical', fontFamily: 'inherit' }}
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder={"Цех механообработки\nСборочный цех №2\nЦех покраски"}
                            autoFocus
                            disabled={isSubmitting}
                        />
                    </div>
                    <p style={{fontSize: '12px', color: '#64748b', marginTop: '4px'}}>
                        Нажмите Enter для разделения названий.
                    </p>
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
                        className={`${styles.button} ${styles.primary}`} 
                        onClick={handleSubmit}
                        disabled={isSubmitting || !text.trim()}
                    >
                        {isSubmitting ? 'Добавление...' : 'Добавить и закрыть'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddWorkshopModal;