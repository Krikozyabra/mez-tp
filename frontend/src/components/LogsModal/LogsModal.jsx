import { useState, useEffect } from 'react';
import { api } from '../../api/api';
import styles from './LogsModal.module.css';

const LogsModal = ({ onClose }) => {
    const [logs, setLogs] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);

    // Закрытие по ESC
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    // Загрузка логов
    useEffect(() => {
        const fetchLogs = async () => {
            setLoading(true);
            try {
                const data = await api.logs.getAll(search);
                // Поддержка пагинации DRF (results) или просто массива
                setLogs(data.results || data || []);
            } catch (e) {
                console.error("Failed to fetch logs", e);
            } finally {
                setLoading(false);
            }
        };
        // Дебаунс для поиска можно добавить, но пока оставим так
        const timeoutId = setTimeout(fetchLogs, 300);
        return () => clearTimeout(timeoutId);
    }, [search]);

    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleString('ru-RU');
    };

    // Определение цвета иконки в зависимости от типа лога
    const getTypeStyle = (type) => {
        // 0: LATE_START, 1: LATE_STOP -> Плохо (Красный)
        // 2: AHEAD_START, 3: AHEAD_STOP -> Хорошо (Зеленый) или Нейтрально
        if (type === 0 || type === 1) return { color: '#ef4444', backgroundColor: '#fee2e2' };
        return { color: '#22c55e', backgroundColor: '#dcfce7' };
    };

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div className={styles.header}>
                    <h2 className={styles.title}>Журнал событий</h2>
                    <button className={styles.closeButton} onClick={onClose}>×</button>
                </div>
                
                <div className={styles.searchBar}>
                    <input 
                        type="text" 
                        placeholder="Поиск по логам..." 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className={styles.searchInput}
                        autoFocus
                    />
                </div>

                <div className={styles.listContainer}>
                    {loading ? (
                        <div className={styles.loading}>Загрузка...</div>
                    ) : logs.length === 0 ? (
                        <div className={styles.empty}>Записей не найдено</div>
                    ) : (
                        logs.map(log => {
                            const typeStyle = getTypeStyle(log.type);
                            return (
                                <div key={log.id} className={styles.logItem}>
                                    <div className={styles.logIcon} style={typeStyle}>
                                        !
                                    </div>
                                    <div className={styles.logContent}>
                                        <div className={styles.logMeta}>
                                            <span className={styles.logDate}>{formatDate(log.logged_at)}</span>
                                            <span className={styles.logMaster}>{log.master_name}</span>
                                        </div>
                                        <div className={styles.logText}>{log.info}</div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
};

export default LogsModal;