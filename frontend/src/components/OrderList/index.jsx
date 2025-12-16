import OrderItem from '../OrderItem';
import styles from './OrderList.module.css';

const OrderList = ({
  orders,
  expandedIds,
  canEdit,
  onToggleOrder,
  onSelectOperation,
  onEditOrder,
  onEditOperation,
  activeOrderId,
  activeOperationId,
  timelineStartByOrder,
  onTimelineStartChange,
  daysRange,
  currentUser,
  onInitiateStart,
  onInitiateFinish
}) => {
    return (
        <div className={styles.list}>
            {orders.map((order) => (
                <OrderItem
                    key={order.id}
                    order={order}
                    isExpanded={expandedIds.has(order.id)}
                    canEdit={canEdit}
                    onToggle={onToggleOrder}
                    onSelectOperation={(currentOrder, operation) => onSelectOperation(currentOrder, operation)}
                    onEditOrder={onEditOrder}
                    onEditOperation={(_, operation) => onEditOperation(operation)}
                    activeOperationId={activeOrderId === order.id ? activeOperationId : null}
                    timelineStartDate={timelineStartByOrder[order.id]}
                    onTimelineStartChange={(date) => onTimelineStartChange(order.id, date)}
                    daysRange={daysRange}
                    
                    // Передаем дальше
                    currentUser={currentUser}
                    onInitiateStart={onInitiateStart}
                    onInitiateFinish={onInitiateFinish}
                />
            ))}
        </div>
    );
};

export default OrderList;