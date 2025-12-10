import styles from "./GanttChart.module.css";

const addDays = (date, days) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const formatDate = (date) =>
  date.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
  });

const formatDateRange = (startDate, endDate) => {
  const formatter = new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
  });
  return `${formatter.format(new Date(startDate))} – ${formatter.format(
    new Date(endDate)
  )}`;
};

const normalizeToDayStart = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const GanttChart = ({
  operations = [],
  activeOperationId,
  orderTitle,
  timelineStartDate,
  compact = false,
  requireSelection = false,
  onSelectOperation,
  onEditOperation,
  canEdit = false,
}) => {
  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  const parsedStart = timelineStartDate
    ? new Date(timelineStartDate + "T00:00:00")
    : new Date();
  const startDate = normalizeToDayStart(
    Number.isNaN(parsedStart.getTime()) ? new Date() : parsedStart
  );
  const hasOperations = operations && operations.length > 0;
  const hasActiveOperation = operations.some(
    (operation) => operation.id === activeOperationId
  );
  const maxEndDate = hasOperations
    ? operations.reduce((latest, operation) => {
        const operationEnd = normalizeToDayStart(operation.endDate);
        return operationEnd > latest ? operationEnd : latest;
      }, startDate)
    : addDays(startDate, 10);
  const columns = Math.max(
    10,
    Math.ceil((maxEndDate - startDate) / MS_PER_DAY) + 1
  );
  const scaleDates = Array.from({ length: columns }, (_, index) =>
    addDays(startDate, index)
  );

  const wrapperClass = compact
    ? `${styles.wrapper} ${styles.compact}`
    : styles.wrapper;

  return (
    <div className={wrapperClass}>
      {!compact ? (
        <div className={styles.header}>
          <div>
            <span className={styles.title}>Диаграмма Ганта</span>
            {orderTitle && <span className={styles.meta}> • {orderTitle}</span>}
          </div>
          {/* Input для выбора даты удален, управление через пропс timelineStartDate */}
        </div>
      ) : (
        /* Compact header тоже очищен от input */
        <div className={styles.compactControls}></div>
      )}
      {hasOperations && (!requireSelection || hasActiveOperation) ? (
        <div className={styles.timeline}>
          <div className={styles.scaleRow}>
            <div className={styles.scaleSpacer}></div>
            <div
              className={styles.scale}
              style={{
                gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
              }}
            >
              {scaleDates.map((date, index) => (
                <span key={`scale-${index}`} className={styles.scaleLabel}>
                  {formatDate(date)}
                </span>
              ))}
            </div>
          </div>
          {operations.map((operation) => {
            const isActive = operation.id === activeOperationId;
            return(
            <div
              key={operation.id}
              className={`${styles.row} ${
                operation.id === activeOperationId ? styles.rowActive : ""
              }`}
              onClick={() => onSelectOperation?.(operation)}
            >
              <div className={styles.operationInfo}>
                <span className={styles.operationName}>{operation.name}</span>
                <span className={styles.operationMeta}>
                                        {/* 1) Пишем Цех */}
                                        <span className={styles.workshopBadge}>{operation.workshopName}</span>
                                        {' • '}
                                        {formatDateRange(operation.startDate, operation.endDate)}
                                    </span>
              </div>
              {canEdit && onEditOperation && (
                <button
                  className={styles.editButton}
                  onClick={(event) => {
                    event.stopPropagation();
                    onEditOperation(operation);
                  }}
                >
                  Изменить
                </button>
              )}
              <div
                className={styles.track}
                style={{
                  "--columns": columns,
                }}
              >
                {/* ОСНОВНАЯ ПОЛОСКА (Текущее состояние) */}
                {(() => {
                  const operationStart = normalizeToDayStart(
                    operation.startDate
                  );
                  const operationEnd = normalizeToDayStart(operation.endDate);
                  const startOffset = Math.floor(
                    (operationStart - startDate) / MS_PER_DAY
                  );
                  const endOffset = Math.ceil(
                    (operationEnd - startDate) / MS_PER_DAY
                  );
                  const duration = Math.max(1, endOffset - startOffset);
                  const clampedStart = Math.max(0, startOffset);
                  const clampedEnd = Math.min(columns, clampedStart + duration);
                  const progressWidth = Math.max(clampedEnd - clampedStart, 0);
                  if (progressWidth <= 0) {
                    return null;
                  }
                  const columnWidth = 100 / columns;
                  // ВЫБОР ЦВЕТА
                  // Если completed = true -> зеленый, иначе -> желтый
                  const colorClass = operation.completed
                    ? styles.progressCompleted
                    : styles.progressPending;

                  return (
                    <div
                      className={`${styles.progress} ${colorClass}`}
                      style={{
                        left: `${clampedStart * columnWidth}%`,
                        width: `${progressWidth * columnWidth}%`,
                        zIndex: 2, // Поверх плановой
                      }}
                    />
                  );
                })()}
                {/* 2) ВТОРАЯ ЛИНИЯ (Изначальный план) - Показываем только при клике */}
                {isActive &&
                  (() => {
                    const planStart = normalizeToDayStart(
                      operation.originalPlannedStart
                    );
                    const planEnd = normalizeToDayStart(
                      operation.originalPlannedEnd
                    );

                    const startOffset = Math.floor(
                      (planStart - startDate) / MS_PER_DAY
                    );
                    const endOffset = Math.ceil(
                      (planEnd - startDate) / MS_PER_DAY
                    );
                    const duration = Math.max(1, endOffset - startOffset);

                    const clampedStart = Math.max(0, startOffset);
                    const clampedEnd = Math.min(
                      columns,
                      clampedStart + duration
                    );
                    const progressWidth = Math.max(
                      clampedEnd - clampedStart,
                      0
                    );

                    if (progressWidth <= 0) return null;
                    const columnWidth = 100 / columns;

                    return (
                      <div
                        className={styles.progressPlanned}
                        style={{
                          left: `${clampedStart * columnWidth}%`,
                          width: `${progressWidth * columnWidth}%`,
                        }}
                        title={`План: ${operation.originalPlannedStart} - ${operation.originalPlannedEnd}`}
                      />
                    );
                  })()}
              </div>
            </div>
            );
        })}
        </div>
      ) : (
        <span className={styles.meta}>
          {requireSelection && !hasActiveOperation
            ? "Выберите операцию в списке слева"
            : "Нет операций для отображения"}
        </span>
      )}
    </div>
  );
};

export default GanttChart;
