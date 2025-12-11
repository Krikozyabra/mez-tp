import { useMemo, useState, useEffect, useCallback } from "react";
import styles from "./MainPage.module.css";
import SearchBar from "../components/SearchBar";
import ControlPanel from "../components/ControlPanel";
import OrderList from "../components/OrderList";
import Modal from "../components/Modal";
import LoginModal from "../components/LoginModal";
import OrderFormPage from "./OrderFormPage";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/api";
import {
  mapBackendDetailToForm,
  mapBackendListToFrontend,
} from "../utils/mappers";
import { formatDateInputValue } from "../utils/dateUtils";

const MainPage = ({ onCreateOrder }) => {
  const { user, role, isAuthenticated, login, logout, hasPermission } = useAuth();

  // --- Состояния данных ---
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const isTechnolog = hasPermission(["technolog"]);
  const canControl = hasPermission(["master", "technolog"]);

  // --- Состояния UI ---
  const [isOrderFormOpen, setIsOrderFormOpen] = useState(false);
  const [orderForEdit, setOrderForEdit] = useState(null);
  const [isFetchingDetails, setIsFetchingDetails] = useState(false);
  const [focusOperationId, setFocusOperationId] = useState(null);

  const [showCompleted, setShowCompleted] = useState(true);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newOrderData, setNewOrderData] = useState({
    title: "",
    description: "",
  });

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedOrderIds, setExpandedOrderIds] = useState(new Set());
  const [activeOrderId, setActiveOrderId] = useState(null);
  const [activeOperationId, setActiveOperationId] = useState(null);
  const [isControlActive, setIsControlActive] = useState(false);
  const [commonTimelineStart, setCommonTimelineStart] = useState(
    formatDateInputValue(new Date())
  );

  // Вспомогательная функция для обновления URL без перезагрузки
  const updateUrlParams = (orderId) => {
    const url = new URL(window.location);
    if (orderId) {
      url.searchParams.set("editOrderId", orderId);
    } else {
      url.searchParams.delete("editOrderId");
    }
    window.history.pushState({}, "", url);
  };

  // 1. Функция открытия заказа (вынесена отдельно, чтобы вызывать и по клику, и при загрузке)
  const openOrderForEdit = useCallback(async (orderId, opId = null) => {
    setIsFetchingDetails(true);
    try {
      const apiData = await api.orders.getOne(orderId);
      if (apiData) {
        const formData = mapBackendDetailToForm(apiData);
        setOrderForEdit(formData);
        setFocusOperationId(opId); // Запоминаем ID операции
        setIsOrderFormOpen(true);
        updateUrlParams(orderId); // Обновляем URL
      }
    } catch (error) {
      console.error(error);
      // Если заказ не найден (например, удален), чистим URL
      updateUrlParams(null);
      alert("Ошибка загрузки заказа или заказ не найден");
    } finally {
      setIsFetchingDetails(false);
    }
  }, []);

  // 2. Восстановление состояния при обновлении страницы (или первом входе)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const editOrderId = params.get("editOrderId");

    if (editOrderId) {
      // Если в URL есть ID, пытаемся открыть заказ
      openOrderForEdit(editOrderId);
    }
  }, [openOrderForEdit]);

  // --- Загрузка списка ---
  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.orders.getAll();
      if (data?.results) {
        const mappedOrders = data.results.map(mapBackendListToFrontend);
        setOrders(mappedOrders);
      }
    } catch (error) {
      console.error("Ошибка загрузки:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [isAuthenticated, fetchOrders]);

  // ... Мемоизация (без изменений) ...
  const timelineStartByOrder = useMemo(() => {
    const map = {};
    orders.forEach((order) => (map[order.id] = commonTimelineStart));
    return map;
  }, [orders, commonTimelineStart]);

  const filteredOrders = useMemo(() => {
    const matchedOrders = orders.filter((order) =>
      order.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return matchedOrders.map((order) => {
      const visibleOperations = showCompleted
        ? order.operations
        : order.operations.filter((op) => !op.completed);

      return { ...order, operations: visibleOperations };
    }).filter(order => {
        // Всегда показываем, если режим "Показывать выполненные"
        if (showCompleted) return true;
        
        // Показываем, если есть активные задачи
        if (order.operations.length > 0) return true;

        // Показываем, если заказ ИЗНАЧАЛЬНО был пуст (это новый заказ)
        // Находим оригинал в orders, чтобы проверить
        // const original = orders.find(o => o.id === order.id);
        // if (original && original.operations.length === 0) return true;

        // Иначе скрываем (значит, заказ был с задачами, но все они выполнены и скрыты)
        return false;
    });
  }, [orders, searchTerm, showCompleted]);

  const assignedOperations = useMemo(() => {
    return orders.flatMap((order) =>
      order.operations
        .filter(
          (operation) =>
            operation.assignedTo === role && // Роль совпадает
            !operation.completed // <--- И операция НЕ выполнена
        )
        .map((operation) => ({
          ...operation,
          orderId: order.id,
          orderTitle: order.title,
        }))
    );
  }, [orders, role]);

  const fetchTimelineStart = useCallback(async () => {
    try {
      const data = await api.operations.getFirst();
      if (data && data.actual_planned_start) {
        const dateStr = formatDateInputValue(data.actual_planned_start);
        setCommonTimelineStart(dateStr);
      }
    } catch (error) {
      console.error("Не удалось обновить дату начала графика:", error);
    }
  }, []);

  // НОВЫЙ USE EFFECT: Загрузка начальной даты графика
  useEffect(() => {
    fetchTimelineStart();
  }, [fetchTimelineStart]); // Пустой массив зависимостей = выполняется 1 раз при загрузке

  // --- Обработчики ---

  // Обработчик клика по кнопке "Изменить" у ОПЕРАЦИИ (в Ганте или Списке)
  const handleEditOperationClick = useCallback((operation) => {
      console.log("Клик по операции:", operation); // <--- Посмотрите в консоль
      // operation.orderId мы добавляли в мапперах ранее (см. mapBackendListToFrontend)
      // Если его нет, нужно убедиться, что он прокидывается в mappers.js
      if (operation.orderId) {
          openOrderForEdit(operation.orderId, operation.id);
      } else {
          console.error("Не найден ID заказа для этой операции");
      }
  }, [openOrderForEdit]);

  const handleCreateOrderClick = () => {
    setNewOrderData({ title: "", description: "" });
    setIsCreateModalOpen(true);
  };

  const handleConfirmControl = useCallback(
    async (operationId) => {
      try {
        await api.operations.complete(operationId);
        // После успешного выполнения обновляем список заказов,
        // чтобы операция пропала из списка "На контроль" (если бэкенд возвращает completed: true в списке)
        await fetchOrders();
      } catch (error) {
        console.error("Ошибка при подтверждении контроля:", error);
        alert("Ошибка при выполнении операции");
      }
    },
    [fetchOrders]
  );

  const handleConfirmCreateOrder = async () => {
    if (!newOrderData.title.trim()) {
      alert("Введите название заказа");
      return;
    }

    try {
      const createdOrder = await api.orders.create(newOrderData);
      await fetchOrders();

      setIsCreateModalOpen(false);

      // Открываем форму и обновляем URL
      const formData = mapBackendDetailToForm(createdOrder);
      setOrderForEdit(formData);
      setIsOrderFormOpen(true);
      updateUrlParams(createdOrder.id);
    } catch (error) {
      console.error("Ошибка создания заказа", error);
      alert("Не удалось создать заказ");
    }
  };

  // Клик по кнопке "Редактировать" в списке
  const handleEditOrderClick = useCallback(
    (orderShort) => {
      openOrderForEdit(orderShort.id);
    },
    [openOrderForEdit]
  );

  // Закрытие формы
  const handleCloseOrderForm = () => {
    setIsOrderFormOpen(false);
    setOrderForEdit(null);
    setFocusOperationId(null); // Сбрасываем фокус
    updateUrlParams(null); // Чистим URL
  };

  const handleSaveOrderForm = async (orderData) => {
    // Здесь будет PUT запрос обновления заказа
    await fetchOrders();
    await fetchTimelineStart();
    handleCloseOrderForm();
  };

  const handleOrderDeleted = async () => {
    setIsOrderFormOpen(false); // Закрываем форму
    setOrderForEdit(null);
    updateUrlParams(null); // Чистим URL
    await fetchOrders(); // Обновляем список
  };

  const handleToggleOrder = useCallback((id) => {
    setExpandedOrderIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  // --- РЕНДЕР ---

  if (isOrderFormOpen) {
    return (
      <OrderFormPage
        order={orderForEdit}
        allOrders={orders}
        onSave={handleSaveOrderForm}
        onCancel={handleCloseOrderForm}
        onDelete={handleOrderDeleted} // <--- ЭТОТ ПРОПС ДОЛЖЕН БЫТЬ
        focusOperationId={focusOperationId} // ПЕРЕДАЕМ ID ДЛЯ ФОКУСА
      />
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.layout}>
        <div className={styles.headerBar}>
          <SearchBar
            value={searchTerm}
            onChange={setSearchTerm}
            onLoginClick={() =>
              isAuthenticated ? logout() : setIsLoginModalOpen(true)
            }
            isAuthenticated={isAuthenticated}
            user={user}
          />
        </div>
        <div className={styles.leftColumn}>
          {/* Кнопка создания видна ТОЛЬКО технологу */}
          {isTechnolog && (
            <button
              className={styles.createButton}
              onClick={handleCreateOrderClick}
            >
              + Заказ
            </button>
          )}
          <ControlPanel
            operations={assignedOperations}
            isControlActive={isControlActive}
            onToggleControl={() => setIsControlActive(!isControlActive)}
            canToggleControl={role === "technolog"}
            onOperationClick={console.log}
            canControl={canControl}
            onConfirmControl={handleConfirmControl}
          />
        </div>
        <section className={styles.ordersArea}>
          <div className={styles.ordersCard}>
            <div className={styles.ordersHeader}>
              <div className={styles.ordersTitle}>
                Заказы{" "}
                {isLoading && (
                  <span style={{ fontSize: "14px", color: "#64748b" }}>
                    (Загрузка...)
                  </span>
                )}
                {isFetchingDetails && (
                  <span style={{ fontSize: "14px", color: "#3b82f6" }}>
                    {" "}
                    (Открытие...)
                  </span>
                )}
              </div>
              {/* Блок управления графиком */}
              <div
                className={styles.controlsGroup}
                style={{ display: "flex", gap: "20px", alignItems: "center" }}
              >
                {/* Чекбокс показа выполненных */}
                <label
                  className={styles.checkboxLabel}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    fontSize: "14px",
                    cursor: "pointer",
                    userSelect: "none",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={showCompleted}
                    onChange={(e) => setShowCompleted(e.target.checked)}
                    style={{ width: "16px", height: "16px", cursor: "pointer" }}
                  />
                  Показывать выполненные
                </label>
                <div className={styles.globalDateControl}>
                  <label htmlFor="global-timeline-start">Начало графика:</label>
                  <input
                    id="global-timeline-start"
                    type="date"
                    className={styles.globalDateInput}
                    value={commonTimelineStart}
                    onChange={(e) => setCommonTimelineStart(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <OrderList
              orders={filteredOrders}
              expandedIds={expandedOrderIds}
              canEdit={isTechnolog}
              onToggleOrder={handleToggleOrder}
              onSelectOperation={(o, op) => {
                setActiveOrderId(o.id);
                setActiveOperationId(op.id);
              }}
              onEditOrder={handleEditOrderClick} // Редактирование заказа целиком
              onEditOperation={handleEditOperationClick} 
              activeOrderId={activeOrderId}
              activeOperationId={activeOperationId}
              timelineStartByOrder={timelineStartByOrder}
              onTimelineStartChange={(_, date) => setCommonTimelineStart(date)}
            />
          </div>
        </section>
      </div>

      {isLoginModalOpen && (
        <LoginModal
          onClose={() => setIsLoginModalOpen(false)}
          onLogin={login}
        />
      )}

      {isCreateModalOpen && (
        <Modal
          title="Новый заказ"
          onClose={() => setIsCreateModalOpen(false)}
          onSubmit={handleConfirmCreateOrder}
          isSubmitDisabled={!newOrderData.title.trim()}
        >
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Название заказа</label>
            <input
              className={styles.formInput}
              value={newOrderData.title}
              onChange={(e) =>
                setNewOrderData({ ...newOrderData, title: e.target.value })
              }
              placeholder="Например: Заказ №123"
              autoFocus
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Описание</label>
            <textarea
              className={styles.formInput}
              style={{ minHeight: "100px", resize: "vertical" }}
              value={newOrderData.description}
              onChange={(e) =>
                setNewOrderData({
                  ...newOrderData,
                  description: e.target.value,
                })
              }
              placeholder="Дополнительная информация"
            />
          </div>
        </Modal>
      )}
    </div>
  );
};

export default MainPage;
