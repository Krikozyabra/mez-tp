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
                    onEditOperation={(currentOrder, operation) => onEditOperation(currentOrder, operation)}
                    activeOperationId={activeOrderId === order.id ? activeOperationId : null}
                    timelineStartDate={timelineStartByOrder[order.id]}
                    onTimelineStartChange={(date) => onTimelineStartChange(order.id, date)}
                />
            ))}
        </div>
    );
};

export default OrderList;
