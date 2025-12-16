import GanttChart from '../GanttChart';
import styles from './OrderItem.module.css';

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
  daysRange,
  currentUser,
  onInitiateStart,
  onInitiateFinish
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
            orderDeadline={order.deadline} 
            onTimelineStartChange={onTimelineStartChange}
            orderTitle={order.title}
            compact
            onSelectOperation={(operation) => onSelectOperation(order, operation)}
            onEditOperation={canEdit ? (operation) => onEditOperation(order, operation) : null}
            canEdit={canEdit}
            daysRange={daysRange}
            currentUser={currentUser}
            onInitiateStart={onInitiateStart}
            onInitiateFinish={onInitiateFinish}
          />
        </div>
      )}
    </div>
  );
};

export default OrderItem;