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
          <GanttChart
            operations={order.operations}
            activeOperationId={activeOperationId}
            timelineStartDate={fallbackTimelineStart}
            onTimelineStartChange={onTimelineStartChange}
            orderTitle={order.title}
            hideLabels={false}
            compact
            requireSelection={false}
            onSelectOperation={(operation) => onSelectOperation(order, operation)}
            onEditOperation={canEdit ? (operation) => onEditOperation(order, operation) : null}
            canEdit={canEdit}
          />
        </div>
      )}
    </div>
  );
};

export default OrderItem;
