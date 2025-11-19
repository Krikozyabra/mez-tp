import GanttChart from '../GanttChart';
import styles from './OrderItem.module.css';

const formatDateRange = (startDate, endDate) => {
  const formatter = new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit' });
  return `${formatter.format(new Date(startDate))} – ${formatter.format(new Date(endDate))}`;
};

const OrderItem = ({
  order,
  isExpanded,
  canEdit,
  onToggle,
  onSelectOperation,
  onEditOrder,
  onEditOperation,
  activeOperationId,
  timelineStartDate,
  onTimelineStartChange,
}) => {
  const fallbackTimelineStart = timelineStartDate || order.operations[0]?.startDate || new Date().toISOString().split('T')[0];

  return (
    <div className={styles.orderCard}>
      <div className={styles.orderHeader} onClick={() => onToggle(order.id)}>
        <div className={styles.titleBlock}>
          <span className={styles.orderTitle}>{order.title}</span>
          <span className={styles.operationsCount}>{order.operations.length} операций</span>
        </div>
        {canEdit && (
          <div className={styles.buttonGroup}>
            <button
              className={styles.secondaryButton}
              onClick={(event) => {
                event.stopPropagation();
                onEditOrder(order);
              }}
            >
              Редактировать
            </button>
          </div>
        )}
      </div>
      {isExpanded && (
        <div className={styles.operationsLayout}>
          <div className={styles.operations}>
            {order.operations.map((operation) => (
              <div
                key={operation.id}
                className={`${styles.operationRow} ${
                  activeOperationId === operation.id ? styles.operationRowActive : ''
                }`}
                onClick={() => onSelectOperation(order, operation)}
              >
                <div className={styles.operationInfo}>
                  <span className={styles.operationName}>{operation.name}</span>
                  <span className={styles.operationMeta}>
                    {formatDateRange(operation.startDate, operation.endDate)} •{' '}
                    {operation.assignedTo === 'technolog' ? 'Технолог' : 'Мастер'}
                  </span>
                </div>
                {canEdit && (
                  <button
                    className={styles.primaryButton}
                    onClick={(event) => {
                      event.stopPropagation();
                      onEditOperation(order, operation);
                    }}
                  >
                    Изменить
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className={styles.timelinePane}>
            <GanttChart
              operations={order.operations}
              activeOperationId={activeOperationId}
              timelineStartDate={fallbackTimelineStart}
              onTimelineStartChange={onTimelineStartChange}
              orderTitle={order.title}
              hideLabels
              compact
              requireSelection
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderItem;
