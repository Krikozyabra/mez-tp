import { useMemo, useState, useEffect } from 'react';
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

const MainPage = ({ orders: ordersProp, setOrders: setOrdersProp, onCreateOrder, onEditOrder }) => {
    const { role, toggleRole } = useRole();
  const [orders, setOrders] = useState(ordersProp || sampleOrders);
  
  // Синхронизируем orders с props
  useEffect(() => {
    if (ordersProp) {
      setOrders(ordersProp);
    }
  }, [ordersProp]);
  
  // Используем переданные функции или локальные
  const handleOrdersChange = setOrdersProp || setOrders;
    const [searchTerm, setSearchTerm] = useState('');
  const [expandedOrderIds, setExpandedOrderIds] = useState(new Set());
  const [activeOrderId, setActiveOrderId] = useState(null);
  const [activeOperationId, setActiveOperationId] = useState(null);
    const [isControlActive, setIsControlActive] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [editingOperation, setEditingOperation] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newOrderTitle, setNewOrderTitle] = useState('');
  const [newOperations, setNewOperations] = useState([]);
  const [currentOperationName, setCurrentOperationName] = useState('');
  const [currentOperationStart, setCurrentOperationStart] = useState('');
  const [currentOperationEnd, setCurrentOperationEnd] = useState('');
  const [currentOperationAssignedTo, setCurrentOperationAssignedTo] = useState('technolog');
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
        if (onCreateOrder) {
            onCreateOrder();
        } else {
            // Fallback для обратной совместимости
            const today = new Date();
            setNewOrderTitle(`Заказ №${orders.length + 10}`);
            setNewOperations([]);
            setCurrentOperationName('');
            setCurrentOperationStart(formatDateInputValue(today));
            setCurrentOperationEnd(formatDateInputValue(addDays(today, 3)));
            setCurrentOperationAssignedTo('technolog');
            setIsCreateModalOpen(true);
        }
    };

    const handleAddOperationToNewOrder = () => {
        if (!currentOperationName.trim() || !currentOperationStart || !currentOperationEnd || 
            new Date(currentOperationEnd) <= new Date(currentOperationStart)) {
            return;
        }
        const newOperation = {
            id: crypto.randomUUID(),
            name: currentOperationName.trim(),
            startDate: currentOperationStart,
            endDate: currentOperationEnd,
            assignedTo: currentOperationAssignedTo,
        };
        setNewOperations((prev) => [...prev, newOperation]);
        setCurrentOperationName('');
        const lastEndDate = new Date(currentOperationEnd);
        setCurrentOperationStart(formatDateInputValue(addDays(lastEndDate, 1)));
        setCurrentOperationEnd(formatDateInputValue(addDays(lastEndDate, 4)));
    };

    const handleRemoveOperationFromNewOrder = (operationId) => {
        setNewOperations((prev) => prev.filter((op) => op.id !== operationId));
    };

  const handleCreateOrderSubmit = () => {
    if (!newOrderTitle.trim() || newOperations.length === 0) {
      return;
    }
    const earliestDate = newOperations.reduce((earliest, op) => {
      const opDate = new Date(op.startDate);
      return !earliest || opDate < earliest ? opDate : earliest;
    }, null);
    const newOrder = {
      id: crypto.randomUUID(),
      title: newOrderTitle.trim(),
      operations: newOperations,
    };
    handleOrdersChange((prev) => [newOrder, ...prev]);
    setExpandedOrderIds((prev) => {
      const next = new Set(prev);
      next.add(newOrder.id);
      return next;
    });
    setTimelineStartByOrder((prev) => ({
      ...prev,
      [newOrder.id]: formatDateInputValue(earliestDate || new Date()),
    }));
    setIsCreateModalOpen(false);
    setNewOrderTitle('');
    setNewOperations([]);
    setCurrentOperationName('');
    setCurrentOperationStart('');
    setCurrentOperationEnd('');
    setCurrentOperationAssignedTo('technolog');
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

  const handleEditOrderClick = (order) => {
    if (onEditOrder) {
      onEditOrder(order);
    } else {
      // Fallback для обратной совместимости
      setEditingOrder({ 
        id: order.id, 
        title: order.title,
        operations: order.operations.map(op => ({ ...op }))
      });
    }
  };

  const handleOrderSubmit = () => {
    if (!editingOrder?.title.trim()) {
      return;
    }
    handleOrdersChange((prev) =>
      prev.map((order) => (order.id === editingOrder.id ? { ...order, title: editingOrder.title, operations: editingOrder.operations } : order)),
    );
    if (editingOrder.id === activeOrderId) {
      const earliest = getEarliestDateFromOperations(editingOrder.operations);
      setTimelineStartByOrder((prev) => ({
        ...prev,
        [editingOrder.id]: prev[editingOrder.id] || earliest,
      }));
    }
    setEditingOrder(null);
  };

  const handleAddOperationToOrder = () => {
    if (!editingOrder) return;
    const today = new Date();
    const lastOperation = editingOrder.operations[editingOrder.operations.length - 1];
    const startDate = lastOperation ? formatDateInputValue(addDays(new Date(lastOperation.endDate), 1)) : formatDateInputValue(today);
    const endDate = lastOperation ? formatDateInputValue(addDays(new Date(lastOperation.endDate), 4)) : formatDateInputValue(addDays(today, 3));
    
    const newOperation = {
      id: crypto.randomUUID(),
      name: 'Новая операция',
      startDate: startDate,
      endDate: endDate,
      assignedTo: 'technolog',
    };
    setEditingOrder({
      ...editingOrder,
      operations: [...editingOrder.operations, newOperation],
    });
  };

  const handleRemoveOperationFromOrder = (operationId) => {
    if (!editingOrder) return;
    setEditingOrder({
      ...editingOrder,
      operations: editingOrder.operations.filter((op) => op.id !== operationId),
    });
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
    handleOrdersChange((prev) => {
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

  const handleDeleteOperation = () => {
    if (!editingOperation) return;
    let nextOrders = orders;
    handleOrdersChange((prev) => {
      const updated = prev.map((order) => {
        if (order.id !== editingOperation.orderId) return order;
        return {
          ...order,
          operations: order.operations.filter((operation) => operation.id !== editingOperation.id),
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
          setActiveOperationId(null);
        }
      }
    }
    setEditingOperation(null);
  };

    const handleControlToggle = () => {
        if (role !== 'technolog') return;
        setIsControlActive((prev) => {
            const newState = !prev;
            // TODO: Вызов API для изменения состояния контроля
            // await api.updateControlState(newState);
            return newState;
        });
    };

    const handleControlOperationClick = (operation) => {
        // TODO: Обработчик клика по операции в панели контроля
        // Можно открыть детали операции, перейти к заказу и т.д.
        console.log('Operation clicked in control panel:', operation);
    };

    const currentRoleLabel = role === 'technolog' ? 'Технолог' : 'Мастер';
    const isOrderSubmitDisabled = !editingOrder?.title.trim();
    const isOperationSubmitDisabled =
        !editingOperation?.name.trim() ||
        new Date(editingOperation?.endDate || 0) <= new Date(editingOperation?.startDate || 0);
    const isCreateSubmitDisabled = !newOrderTitle.trim() || newOperations.length === 0;
    const canAddOperation = currentOperationName.trim() && 
        currentOperationStart && 
        currentOperationEnd && 
        new Date(currentOperationEnd) > new Date(currentOperationStart);

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
                        onOperationClick={handleControlOperationClick}
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
                            onEditOrder={handleEditOrderClick}
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
                        setNewOperations([]);
                        setCurrentOperationName('');
                        setCurrentOperationStart('');
                        setCurrentOperationEnd('');
                        setCurrentOperationAssignedTo('technolog');
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
                    {newOperations.length > 0 && (
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Добавленные операции ({newOperations.length})</label>
                            <div className={styles.operationsList}>
                                {newOperations.map((operation) => (
                                    <div key={operation.id} className={styles.operationItem}>
                                        <div>
                                            <span className={styles.operationItemName}>{operation.name}</span>
                                            <span className={styles.operationItemMeta}>
                                                {new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit' }).format(new Date(operation.startDate))} –{' '}
                                                {new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit' }).format(new Date(operation.endDate))} •{' '}
                                                {operation.assignedTo === 'technolog' ? 'Технолог' : 'Мастер'}
                                            </span>
                                        </div>
                                        <button
                                            type="button"
                                            className={styles.removeButton}
                                            onClick={() => handleRemoveOperationFromNewOrder(operation.id)}
                                        >
                                            Удалить
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Добавить операцию</label>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel} htmlFor="currentOperationName">
                                Название операции
                            </label>
                            <input
                                id="currentOperationName"
                                className={styles.formInput}
                                value={currentOperationName}
                                onChange={(event) => setCurrentOperationName(event.target.value)}
                                placeholder="Введите название операции"
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel} htmlFor="currentOperationStart">
                                Начало операции
                            </label>
                            <input
                                id="currentOperationStart"
                                type="date"
                                className={styles.formInput}
                                value={currentOperationStart}
                                onChange={(event) => setCurrentOperationStart(event.target.value)}
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel} htmlFor="currentOperationEnd">
                                Окончание операции
                            </label>
                            <input
                                id="currentOperationEnd"
                                type="date"
                                className={styles.formInput}
                                value={currentOperationEnd}
                                onChange={(event) => setCurrentOperationEnd(event.target.value)}
                            />
                            {currentOperationEnd && currentOperationStart && new Date(currentOperationEnd) <= new Date(currentOperationStart) && (
                                <span className={styles.errorText}>Окончание должно быть позже начала</span>
                            )}
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel} htmlFor="currentOperationAssignedTo">
                                Назначено
                            </label>
                            <select
                                id="currentOperationAssignedTo"
                                className={styles.formSelect}
                                value={currentOperationAssignedTo}
                                onChange={(event) => setCurrentOperationAssignedTo(event.target.value)}
                            >
                                <option value="technolog">Технолог</option>
                                <option value="master">Мастер</option>
                            </select>
                        </div>
                        <button
                            type="button"
                            className={styles.addOperationButton}
                            onClick={handleAddOperationToNewOrder}
                            disabled={!canAddOperation}
                        >
                            + Добавить операцию
                        </button>
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
                    {editingOrder.operations && editingOrder.operations.length > 0 && (
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Операции ({editingOrder.operations.length})</label>
                            <div className={styles.operationsList}>
                                {editingOrder.operations.map((operation) => (
                                    <div key={operation.id} className={styles.operationItem}>
                                        <div>
                                            <span className={styles.operationItemName}>{operation.name}</span>
                                            <span className={styles.operationItemMeta}>
                                                {new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit' }).format(new Date(operation.startDate))} –{' '}
                                                {new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit' }).format(new Date(operation.endDate))} •{' '}
                                                {operation.assignedTo === 'technolog' ? 'Технолог' : 'Мастер'}
                                            </span>
                                        </div>
                                        <button
                                            type="button"
                                            className={styles.removeButton}
                                            onClick={() => handleRemoveOperationFromOrder(operation.id)}
                                        >
                                            Удалить
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    <div className={styles.formGroup}>
                        <button
                            type="button"
                            className={styles.addOperationButton}
                            onClick={handleAddOperationToOrder}
                        >
                            + Добавить операцию
                        </button>
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
                    <div className={styles.formGroup}>
                        <button
                            type="button"
                            className={styles.deleteButton}
                            onClick={handleDeleteOperation}
                        >
                            Удалить операцию
                        </button>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default MainPage;
