import { useMemo, useState } from 'react';
import styles from './MainPage.module.css';
import SearchBar from '../components/SearchBar';
import ControlPanel from '../components/ControlPanel';
import OrderList from '../components/OrderList';
import Modal from '../components/Modal';
import { sampleOrders } from '../mock/sampleOrders';
import { useRole } from '../context/RoleContext';

const formatDateInputValue = (date) => date.toISOString().split('T')[0];


const getEarliestDateFromOperations = (operations) => {
  if (!operations.length) {
    return formatDateInputValue(new Date());
  }
  const earliest = operations.reduce((min, operation) => {
    const date = new Date(operation.startDate);
    if (!min || date < min) {
      return date;
    }
    return min;
  }, null);
  return formatDateInputValue(earliest || new Date());
};

const getEarliestDateFromOrders = (ordersData) => {
  if (!ordersData.length) {
    return formatDateInputValue(new Date());
  }
  const earliest = ordersData.reduce((min, order) => {
    const orderEarliest = getEarliestDateFromOperations(order.operations);
    const date = new Date(orderEarliest);
    if (!min || date < min) {
      return date;
    }
    return min;
  }, null);
  return formatDateInputValue(earliest || new Date());
};

const addDays = (date, days) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const MainPage = () => {
  const { role, toggleRole } = useRole();
  const [orders, setOrders] = useState(sampleOrders);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedOrderIds, setExpandedOrderIds] = useState(new Set());
  const [activeOrderId, setActiveOrderId] = useState(null);
  const [activeOperationId, setActiveOperationId] = useState(null);
  const [isControlActive, setIsControlActive] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [editingOperation, setEditingOperation] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newOrderTitle, setNewOrderTitle] = useState('');
  const [newOperationStart, setNewOperationStart] = useState('');
  const [newOperationEnd, setNewOperationEnd] = useState('');
  const [timelineStartByOrder, setTimelineStartByOrder] = useState(() => {
    const initial = {};
    sampleOrders.forEach((order) => {
      initial[order.id] = getEarliestDateFromOperations(order.operations);
    });
    return initial;
  });

    const filteredOrders = useMemo(() => {
        return orders.filter((order) => order.title.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [orders, searchTerm]);

    const assignedOperations = useMemo(() => {
        return orders.flatMap((order) =>
            order.operations
                .filter((operation) => operation.assignedTo === role)
                .map((operation) => ({
                    ...operation,
                    orderId: order.id,
                    orderTitle: order.title,
                })),
        );
    }, [orders, role]);

    const handleToggleOrder = (id) => {
        setExpandedOrderIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const handleCreateOrderClick = () => {
        if (role !== 'technolog') return;
        const today = new Date();
        setNewOrderTitle(`Заказ №${orders.length + 10}`);
        setNewOperationStart(formatDateInputValue(today));
        setNewOperationEnd(formatDateInputValue(addDays(today, 3)));
        setIsCreateModalOpen(true);
    };

  const handleCreateOrderSubmit = () => {
    if (!newOrderTitle.trim() || new Date(newOperationStart) >= new Date(newOperationEnd)) {
      return;
    }
    const newOrder = {
      id: crypto.randomUUID(),
      title: newOrderTitle.trim(),
      operations: [
        {
          id: crypto.randomUUID(),
          name: 'Новая операция',
          startDate: newOperationStart,
          endDate: newOperationEnd,
          assignedTo: 'technolog',
        },
      ],
    };
    setOrders((prev) => [newOrder, ...prev]);
    setExpandedOrderIds((prev) => {
      const next = new Set(prev);
      next.add(newOrder.id);
      return next;
    });
    setTimelineStartByOrder((prev) => ({
      ...prev,
      [newOrder.id]: newOperationStart,
    }));
    setIsCreateModalOpen(false);
    setNewOrderTitle('');
    setNewOperationStart('');
    setNewOperationEnd('');
  };

  const handleSelectOperation = (order, operation) => {
    setActiveOrderId(order.id);
    setActiveOperationId(operation.id);
    setTimelineStartByOrder((prev) => {
      if (prev[order.id]) {
        return prev;
      }
      return {
        ...prev,
        [order.id]: getEarliestDateFromOperations(order.operations),
      };
    });
  };

  const handleEditOrder = (order) => {
    setEditingOrder({ id: order.id, title: order.title });
  };

  const handleOrderSubmit = () => {
    if (!editingOrder?.title.trim()) {
      return;
    }
    setOrders((prev) =>
      prev.map((order) => (order.id === editingOrder.id ? { ...order, title: editingOrder.title } : order)),
    );
    setEditingOrder(null);
  };

    const handleEditOperation = (order, operation) => {
        setEditingOperation({
            orderId: order.id,
            id: operation.id,
            name: operation.name,
            startDate: operation.startDate,
            endDate: operation.endDate,
            assignedTo: operation.assignedTo,
        });
    };

  const handleOperationSubmit = () => {
    if (
      !editingOperation?.name.trim() ||
      new Date(editingOperation.endDate) <= new Date(editingOperation.startDate)
    ) {
      return;
    }
    let nextOrders = orders;
    setOrders((prev) => {
      const updated = prev.map((order) => {
        if (order.id !== editingOperation.orderId) return order;
        return {
          ...order,
          operations: order.operations.map((operation) =>
            operation.id === editingOperation.id
              ? {
                  ...operation,
                  name: editingOperation.name,
                  startDate: editingOperation.startDate,
                  endDate: editingOperation.endDate,
                  assignedTo: editingOperation.assignedTo,
                }
              : operation,
          ),
        };
      });
      nextOrders = updated;
      return updated;
    });
    if (nextOrders) {
      const updatedOrder = nextOrders.find((order) => order.id === editingOperation.orderId);
      if (updatedOrder) {
        const earliest = getEarliestDateFromOperations(updatedOrder.operations);
        setTimelineStartByOrder((prev) => ({
          ...prev,
          [updatedOrder.id]: prev[updatedOrder.id] || earliest,
        }));
        if (activeOrderId === updatedOrder.id) {
          const hasActive = updatedOrder.operations.some((operation) => operation.id === activeOperationId);
          if (!hasActive) {
            setActiveOperationId(null);
          }
        }
      }
    }
    setEditingOperation(null);
  };

    const handleControlToggle = () => {
        if (role !== 'technolog') return;
        setIsControlActive((prev) => !prev);
    };

    const currentRoleLabel = role === 'technolog' ? 'Технолог' : 'Мастер';
    const isOrderSubmitDisabled = !editingOrder?.title.trim();
    const isOperationSubmitDisabled =
        !editingOperation?.name.trim() ||
        new Date(editingOperation?.endDate || 0) <= new Date(editingOperation?.startDate || 0);
    const isCreateSubmitDisabled =
        !newOrderTitle.trim() || new Date(newOperationEnd || 0) <= new Date(newOperationStart || 0);

    return (
        <div className={styles.page}>
            <div className={styles.layout}>
                <div className={styles.headerBar}>
                    <SearchBar
                        value={searchTerm}
                        onChange={setSearchTerm}
                        onToggleRole={toggleRole}
                        currentRoleLabel={currentRoleLabel}
                    />
                </div>
                <div className={styles.leftColumn}>
                    <button className={styles.createButton} onClick={handleCreateOrderClick} disabled={role !== 'technolog'}>
                        + Заказ
                    </button>
                    <ControlPanel
                        operations={assignedOperations}
                        isControlActive={isControlActive}
                        onToggleControl={handleControlToggle}
                        canToggleControl={role === 'technolog'}
                    />
                </div>
                <section className={styles.ordersArea}>
                    <div className={styles.ordersCard}>
                        <div className={styles.ordersTitle}>Заказы</div>
                        <OrderList
                            orders={filteredOrders}
                            expandedIds={expandedOrderIds}
                            canEdit={role === 'technolog'}
                            onToggleOrder={handleToggleOrder}
                            onSelectOperation={handleSelectOperation}
                            onEditOrder={handleEditOrder}
                            onEditOperation={handleEditOperation}
                            activeOrderId={activeOrderId}
                            activeOperationId={activeOperationId}
                            timelineStartByOrder={timelineStartByOrder}
                            onTimelineStartChange={(orderId, date) =>
                                setTimelineStartByOrder((prev) => ({ ...prev, [orderId]: date }))
                            }
                        />
                    </div>
                </section>
            </div>
            {isCreateModalOpen && (
                <Modal
                    title="Новый заказ"
                    onClose={() => {
                        setIsCreateModalOpen(false);
                        setNewOrderTitle('');
                        setNewOperationStart('');
                        setNewOperationEnd('');
                    }}
                    onSubmit={handleCreateOrderSubmit}
                    isSubmitDisabled={isCreateSubmitDisabled}
                >
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel} htmlFor="newOrderTitle">
                            Название заказа
                        </label>
                        <input
                            id="newOrderTitle"
                            className={styles.formInput}
                            value={newOrderTitle}
                            onChange={(event) => setNewOrderTitle(event.target.value)}
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel} htmlFor="newOrderStart">
                            Начало операции
                        </label>
                        <input
                            id="newOrderStart"
                            type="date"
                            className={styles.formInput}
                            value={newOperationStart}
                            onChange={(event) => setNewOperationStart(event.target.value)}
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel} htmlFor="newOrderEnd">
                            Окончание операции
                        </label>
                        <input
                            id="newOrderEnd"
                            type="date"
                            className={styles.formInput}
                            value={newOperationEnd}
                            onChange={(event) => setNewOperationEnd(event.target.value)}
                        />
                        {newOperationEnd && newOperationStart && new Date(newOperationEnd) <= new Date(newOperationStart) && (
                            <span className={styles.errorText}>Окончание должно быть позже начала</span>
                        )}
                    </div>
                </Modal>
            )}
            {editingOrder && (
                <Modal
                    title="Редактирование заказа"
                    onClose={() => setEditingOrder(null)}
                    onSubmit={handleOrderSubmit}
                    isSubmitDisabled={isOrderSubmitDisabled}
                >
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel} htmlFor="orderTitle">
                            Название заказа
                        </label>
                        <input
                            id="orderTitle"
                            className={styles.formInput}
                            value={editingOrder.title}
                            onChange={(event) => setEditingOrder({ ...editingOrder, title: event.target.value })}
                        />
                    </div>
                </Modal>
            )}
            {editingOperation && (
                <Modal
                    title="Редактирование операции"
                    onClose={() => setEditingOperation(null)}
                    onSubmit={handleOperationSubmit}
                    isSubmitDisabled={isOperationSubmitDisabled}
                >
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel} htmlFor="operationName">
                            Название операции
                        </label>
                        <input
                            id="operationName"
                            className={styles.formInput}
                            value={editingOperation.name}
                            onChange={(event) => setEditingOperation({ ...editingOperation, name: event.target.value })}
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel} htmlFor="operationStart">
                            Начало (дата)
                        </label>
                        <input
                            id="operationStart"
                            type="date"
                            className={styles.formInput}
                            value={editingOperation.startDate}
                            onChange={(event) =>
                                setEditingOperation({ ...editingOperation, startDate: event.target.value })
                            }
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel} htmlFor="operationEnd">
                            Окончание (дата)
                        </label>
                        <input
                            id="operationEnd"
                            type="date"
                            className={styles.formInput}
                            value={editingOperation.endDate}
                            onChange={(event) =>
                                setEditingOperation({ ...editingOperation, endDate: event.target.value })
                            }
                        />
                        {new Date(editingOperation.endDate) <= new Date(editingOperation.startDate) && (
                            <span className={styles.errorText}>Окончание должно быть позже начала</span>
                        )}
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel} htmlFor="operationAssigned">
                            Ответственный
                        </label>
                        <select
                            id="operationAssigned"
                            className={styles.formSelect}
                            value={editingOperation.assignedTo}
                            onChange={(event) =>
                                setEditingOperation({ ...editingOperation, assignedTo: event.target.value })
                            }
                        >
                            <option value="technolog">Технолог</option>
                            <option value="master">Мастер</option>
                        </select>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default MainPage;
