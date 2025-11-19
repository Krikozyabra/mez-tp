import styles from './GanttChart.module.css';

const addDays = (date, days) => {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
};

const formatDate = (date) =>
    date.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
    });

const GanttChart = ({
    operations = [],
    activeOperationId,
    orderTitle,
    timelineStartDate,
    onTimelineStartChange,
    hideLabels = false,
    compact = false,
    requireSelection = false,
}) => {
    const MS_PER_DAY = 1000 * 60 * 60 * 24;
    const parsedStart = timelineStartDate ? new Date(timelineStartDate) : new Date();
    const startDate = Number.isNaN(parsedStart.getTime()) ? new Date() : parsedStart;
    const hasOperations = operations && operations.length > 0;
    const hasActiveOperation = operations.some((operation) => operation.id === activeOperationId);
    const maxEndDate = hasOperations
        ? operations.reduce((latest, operation) => {
            const operationEnd = new Date(operation.endDate);
            return operationEnd > latest ? operationEnd : latest;
        }, new Date(timelineStartDate || startDate))
        : addDays(startDate, 10);
    const columns = Math.max(10, Math.ceil((maxEndDate - startDate) / MS_PER_DAY) + 1);
    const scaleDates = Array.from({ length: columns }, (_, index) => addDays(startDate, index));

    const wrapperClass = compact ? `${styles.wrapper} ${styles.compact}` : styles.wrapper;

    return (
        <div className={wrapperClass}>
            {!compact ? (
                <div className={styles.header}>
                    <div>
                        <span className={styles.title}>Диаграмма Ганта</span>
                        {orderTitle && <span className={styles.meta}> • {orderTitle}</span>}
                    </div>
                    <label className={styles.controls}>
                        Начало:
                        <input
                            type="date"
                            className={styles.dateInput}
                            value={timelineStartDate || ''}
                            onChange={(event) => onTimelineStartChange?.(event.target.value)}
                        />
                    </label>
                </div>
            ) : (
                <div className={styles.compactControls}>
                    <label className={styles.controls}>
                        Начало:
                        <input
                            type="date"
                            className={styles.dateInput}
                            value={timelineStartDate || ''}
                            onChange={(event) => onTimelineStartChange?.(event.target.value)}
                        />
                    </label>
                </div>
            )}
            {hasOperations && (!requireSelection || hasActiveOperation) ? (
                <div className={styles.timeline}>
                    <div className={styles.scale} style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
                        {scaleDates.map((date, index) => (
                            <span key={`scale-${index}`} className={styles.scaleLabel}>
                                {formatDate(date)}
                            </span>
                        ))}
                    </div>
                    {operations.map((operation) => (
                        <div
                            key={operation.id}
                            className={`${styles.row} ${operation.id === activeOperationId ? styles.rowActive : ''}`}
                        >
                            <span
                                className={`${styles.rowLabel} ${hideLabels ? styles.rowLabelHidden : ''}`}
                            >
                                {hideLabels ? '.' : operation.name}
                            </span>
                            <div
                                className={styles.track}
                                style={{
                                    '--columns': columns,
                                }}
                            >
                                {(() => {
                                    const operationStart = new Date(operation.startDate);
                                    const operationEnd = new Date(operation.endDate);
                                    const startOffset = Math.floor((operationStart - startDate) / MS_PER_DAY);
                                    const duration = Math.max(1, Math.ceil((operationEnd - operationStart) / MS_PER_DAY));
                                    const rawEnd = startOffset + duration;
                                    const clampedStart = Math.max(0, startOffset);
                                    const clampedEnd = Math.min(columns, rawEnd);
                                    const progressWidth = Math.max(clampedEnd - clampedStart, 0);
                                    if (progressWidth <= 0) {
                                        return null;
                                    }
                                    return (
                                        <div
                                            className={styles.progress}
                                            style={{
                                                left: `${(clampedStart / columns) * 100}%`,
                                                width: `${(progressWidth / columns) * 100}%`,
                                            }}
                                        />
                                    );
                                })()}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <span className={styles.meta}>
                    {requireSelection && !hasActiveOperation
                        ? 'Выберите операцию в списке слева'
                        : 'Нет операций для отображения'}
                </span>
            )}
        </div>
    );
};

export default GanttChart;
