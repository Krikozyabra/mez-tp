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

    const fetchLatestLogs = async () => {
        try {
            const data = await api.logs.getLatest();
            const results = data.results || data || [];
            setLogs(results.slice(0, 5));
            if (results.length > 0) setHasUnread(true);
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        fetchLatestLogs();
        const interval = setInterval(fetchLatestLogs, 60000);
        return () => clearInterval(interval);
    }, []);

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
            fetchLatestLogs();
            setHasUnread(false);
        }
    };

    return (
        <div className={styles.container} ref={dropdownRef}>
            <button className={styles.bellButton} onClick={toggleDropdown} title="Уведомления">
                <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    width="24" 
                    height="24" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                    className={styles.bellIconSvg}
                >
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                </svg>
                
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