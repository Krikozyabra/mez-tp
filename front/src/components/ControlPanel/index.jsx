import styles from './ControlPanel.module.css';

const formatDateRange = (startDate, endDate) => {
    const formatter = new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit' });
    return `${formatter.format(new Date(startDate))} – ${formatter.format(new Date(endDate))}`;
};

const ControlPanel = ({ operations, isControlActive, onToggleControl, canToggleControl }) => {
    return (
        <div className={styles.panel}>
            <div className={styles.header}>
                <span className={styles.title}>Контроль</span>
                <button className={styles.controlButton} disabled={!canToggleControl} onClick={onToggleControl}>
                    {isControlActive ? 'Контроль включён' : 'Контроль выключен'}
                </button>
            </div>
            <div className={styles.list}>
                {operations.length === 0 && <span>Операций нет</span>}
                {operations.map((operation) => (
                    <div key={operation.id} className={styles.operation}>
                        <div className={styles.operationTitle}>{operation.name}</div>
                        <div className={styles.operationMeta}>
                            {operation.orderTitle} • {formatDateRange(operation.startDate, operation.endDate)}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ControlPanel;

