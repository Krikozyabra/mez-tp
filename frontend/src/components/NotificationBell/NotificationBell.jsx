import { useState, useEffect, useRef } from 'react';
import { api } from '../../api/api';
import LogsModal from '../LogsModal/LogsModal';
import styles from './NotificationBell.module.css';

const NotificationBell = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [logs, setLogs] = useState([]);
    const [hasUnread, setHasUnread] = useState(false);
    const [showAllModal, setShowAllModal] = useState(false);
    const dropdownRef = useRef(null);

    // Загрузка последних 5 логов
    const fetchLatestLogs = async () => {
        try {
            const data = await api.logs.getLatest();
            const results = data.results || data || [];
            setLogs(results.slice(0, 5));
            // Логику "непрочитанности" можно усложнить, пока просто: если есть логи - есть уведомления
            if (results.length > 0) setHasUnread(true);
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        fetchLatestLogs();
        // Можно добавить поллинг (интервал) раз в минуту
        const interval = setInterval(fetchLatestLogs, 60000);
        return () => clearInterval(interval);
    }, []);

    // Закрытие дропдауна при клике вне
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleDropdown = () => {
        setIsOpen(!isOpen);
        if (!isOpen) {
            // При открытии обновляем список
            fetchLatestLogs();
            setHasUnread(false); // Сбрасываем "непрочитанность" при открытии
        }
    };

    return (
        <div className={styles.container} ref={dropdownRef}>
            <button className={styles.bellButton} onClick={toggleDropdown}>
                <span className={styles.bellIcon}>🔔</span>
                {hasUnread && <span className={styles.badge} />}
            </button>

            {isOpen && (
                <div className={styles.dropdown}>
                    <div className={styles.dropdownHeader}>Последние события</div>
                    <div className={styles.list}>
                        {logs.length === 0 ? (
                            <div className={styles.empty}>Нет новых уведомлений</div>
                        ) : (
                            logs.map(log => (
                                <div key={log.id} className={styles.item}>
                                    <div className={styles.itemText}>{log.info}</div>
                                    <div className={styles.itemDate}>{new Date(log.logged_at).toLocaleTimeString()}</div>
                                </div>
                            ))
                        )}
                    </div>
                    <button 
                        className={styles.showAllButton}
                        onClick={() => {
                            setIsOpen(false);
                            setShowAllModal(true);
                        }}
                    >
                        Показать все логи
                    </button>
                </div>
            )}

            {showAllModal && <LogsModal onClose={() => setShowAllModal(false)} />}
        </div>
    );
};

export default NotificationBell;