import { useMemo, useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import styles from "./MainPage.module.css";
import SearchBar from "../components/SearchBar";
import OrderList from "../components/OrderList";
import Modal from "../components/Modal";
import LoginModal from "../components/LoginModal";
import OrderFormPage from "./OrderFormPage";
import StartOperationModal from "../components/StartOperationModal";
import AddWorkshopModal from "../components/AddWorkshopModal";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/api";
import {
  mapBackendDetailToForm,
  mapBackendListToFrontend,
} from "../utils/mappers";
import { formatDateInputValue } from "../utils/dateUtils";

const MainPage = ({ onCreateOrder }) => {
  const { user, role, isAuthenticated, login, logout, hasPermission } = useAuth();

  const [orders, setOrders] = useState([]);
  const [mastersList, setMastersList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const isTechnolog = hasPermission(["technolog"]);

  // --- Состояния UI ---
  const [isOrderFormOpen, setIsOrderFormOpen] = useState(false);
  const [isWorkshopModalOpen, setIsWorkshopModalOpen] = useState(false); // <--- Используем состояние
  const [orderForEdit, setOrderForEdit] = useState(null);
  const [isFetchingDetails, setIsFetchingDetails] = useState(false);
  const [focusOperationId, setFocusOperationId] = useState(null);
  const [showCompleted, setShowCompleted] = useState(true);
  
  // Состояния для МОДАЛЬНЫХ ОКОН ДЕЙСТВИЙ (Старт/Стоп)
  const [opToStart, setOpToStart] = useState(null);
  const [opToFinish, setOpToFinish] = useState(null);

  const [ganttPeriod, setGanttPeriod] = useState(() => {
      const saved = localStorage.getItem("ganttPeriod");
      return saved ? parseInt(saved, 10) : 60;
  });

  const handleGanttPeriodChange = (e) => {
      const val = parseInt(e.target.value, 10);
      setGanttPeriod(val);
      localStorage.setItem("ganttPeriod", val);
  };

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newOrderData, setNewOrderData] = useState({
    title: "",
    description: "",
    deadline: "",
    defaultMasterId: ""
  });

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedOrderIds, setExpandedOrderIds] = useState(new Set());
  const [activeOrderId, setActiveOrderId] = useState(null);
  const [activeOperationId, setActiveOperationId] = useState(null);
  const [commonTimelineStart, setCommonTimelineStart] = useState(() => {
    const saved = localStorage.getItem("ganttTimelineStart");
    return saved || formatDateInputValue(new Date());
  });

  // ... (Вспомогательные функции API и хуки без изменений) ...
  const updateUrlParams = (orderId) => {
    const url = new URL(window.location);
    if (orderId) url.searchParams.set("editOrderId", orderId);
    else url.searchParams.delete("editOrderId");
    window.history.pushState({}, "", url);
  };

  const openOrderForEdit = useCallback(async (orderId, opId = null) => {
    setIsFetchingDetails(true);
    try {
      const apiData = await api.orders.getOne(orderId);
      if (apiData) {
        const formData = mapBackendDetailToForm(apiData);
        setOrderForEdit(formData);
        setFocusOperationId(opId);
        setIsOrderFormOpen(true);
        updateUrlParams(orderId);
      }
    } catch (error) {
      console.error(error);
      updateUrlParams(null);
      alert("Ошибка загрузки заказа");
    } finally {
      setIsFetchingDetails(false);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const editOrderId = params.get("editOrderId");
    if (editOrderId) openOrderForEdit(editOrderId);
  }, [openOrderForEdit]);

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
      if (isAuthenticated) {
          const loadMasters = async () => {
            try {
              const data = await api.refs.getMasters();
              setMastersList(data?.results || []);
            } catch (error) { console.error(error); }
          };
          loadMasters();
          fetchOrders();
      }
  }, [isAuthenticated, fetchOrders]);


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
    }).filter(order => showCompleted ? true : order.operations.length > 0);
  }, [orders, searchTerm, showCompleted]);

   const fetchTimelineStart = useCallback(async () => {
    if (localStorage.getItem("ganttTimelineStart")) {
        return;
    }
    try {
        const data = await api.operations.getFirst();
        const dateValue = data?.actual_planned_start || data?.planned_start;
        if (dateValue) {
            const cleanDate = dateValue.toString().split(' ')[0].split('T')[0];
            setCommonTimelineStart(cleanDate);
        }
    } catch (error) {
        console.error("Не удалось получить дату первой операции:", error);
    }
  }, []);

  useEffect(() => { fetchTimelineStart(); }, [fetchTimelineStart]);

  // --- Обработчики ---
  const handleEditOperationClick = useCallback((operation) => {
      if (operation.orderId) openOrderForEdit(operation.orderId, operation.id);
  }, [openOrderForEdit]);

  const handleDateChange = (e) => {
      const newValue = e.target.value;
      setCommonTimelineStart(newValue);
      localStorage.setItem("ganttTimelineStart", newValue);
  };

  const handleCreateOrderClick = () => {
    setNewOrderData({ title: "", description: "", deadline: "", defaultMasterId: "" });
    setIsCreateModalOpen(true);
  };
  
  const handleInitiateStart = (operation) => setOpToStart(operation);
  const handleInitiateFinish = (operation) => setOpToFinish(operation);

  const handleConfirmStart = async (opId, workshopId, executorIds) => {
      try {
          await api.operations.start(opId, workshopId, executorIds);
          await fetchOrders();
      } catch (e) { alert("Ошибка старта: " + e.message); }
      finally { setOpToStart(null); }
  };

  const handleConfirmFinish = async () => {
      if (!opToFinish) return;
      try {
          await api.operations.end(opToFinish.id);
          await fetchOrders();
      } catch (e) { alert("Ошибка завершения"); }
      finally { setOpToFinish(null); }
  };

  const handleConfirmCreateOrder = async () => {
    if (!newOrderData.title.trim() || !newOrderData.deadline) {
      alert("Заполните название и дедлайн"); return;
    }
    try {
      const createdOrder = await api.orders.create(newOrderData);
      await fetchOrders();
      setIsCreateModalOpen(false);
      const formData = mapBackendDetailToForm(createdOrder);
      setOrderForEdit(formData);
      setIsOrderFormOpen(true);
    } catch (error) { alert("Не удалось создать заказ: " + error.message); }
  };

  const handleCloseOrderForm = async () => {
    setIsOrderFormOpen(false);
    setOrderForEdit(null);
    setFocusOperationId(null);
    updateUrlParams(null);
    await fetchOrders(); 
    await fetchTimelineStart();
  };

  const handleSelectOperation = (order, operation) => {
        if (activeOperationId === operation.id) {
            setActiveOrderId(null); setActiveOperationId(null);
        } else {
            setActiveOrderId(order.id); setActiveOperationId(operation.id);
        }
    };

  const handleSaveOrderForm = async () => {
    await fetchOrders();
    await fetchTimelineStart();
    handleCloseOrderForm();
  };

  const handleOrderDeleted = async () => {
    setIsOrderFormOpen(false);
    setOrderForEdit(null);
    updateUrlParams(null);
    await fetchOrders();
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
        onSave={handleSaveOrderForm}
        onCancel={handleCloseOrderForm}
        onDelete={handleOrderDeleted}
        focusOperationId={focusOperationId}
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
            onLoginClick={() => isAuthenticated ? logout() : setIsLoginModalOpen(true)}
            isAuthenticated={isAuthenticated}
            user={user}
          />
        </div>
        <section className={styles.ordersArea}>
          <div className={styles.ordersCard}>
            <div className={styles.ordersHeader}>
              <div className={styles.ordersTitle}>
                Заказы {isLoading && <span style={{fontSize: "14px", color: "#64748b"}}>(Загрузка...)</span>}
                
                {/* КНОПКИ ДЛЯ ТЕХНОЛОГА */}
                {isTechnolog && (
                    <>
                        <button 
                            className={styles.createButtonSmall} 
                            onClick={handleCreateOrderClick}
                            style={{marginLeft: '16px', padding: '6px 12px', fontSize: '14px', borderRadius: '8px'}}
                        >
                            + Новый
                        </button>
                        <button 
                            className={styles.createButtonSmall} 
                            onClick={() => setIsWorkshopModalOpen(true)} // Открытие модалки цехов
                            style={{marginLeft: '8px', padding: '6px 12px', fontSize: '14px', borderRadius: '8px', backgroundColor: '#3b82f6'}}
                        >
                            + Цех
                        </button>
                    </>
                )}
              </div>
              
              <div className={styles.controlsGroup} style={{ display: "flex", gap: "20px", alignItems: "center" }}>
                {/* ... (фильтры и дата) ... */}
                <label className={styles.checkboxLabel} style={{display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", cursor: "pointer"}}>
                  <input type="checkbox" checked={showCompleted} onChange={(e) => setShowCompleted(e.target.checked)} style={{ width: "16px", height: "16px"}} />
                  Показывать выполненные
                </label>
                
                <div className={styles.globalDateControl}>
                   <label>Масштаб:</label>
                   <select 
                      className={styles.globalDateInput} 
                      value={ganttPeriod} 
                      onChange={handleGanttPeriodChange}
                   >
                       <option value={30}>30 дней</option>
                       <option value={60}>60 дней</option>
                       <option value={90}>90 дней</option>
                       <option value={120}>120 дней</option>
                       <option value={365}>1 год</option>
                   </select>
                </div>

                <div className={styles.globalDateControl}>
                  <label htmlFor="global-timeline-start">Начало:</label>
                  <input
                    id="global-timeline-start"
                    type="date"
                    className={styles.globalDateInput}
                    value={commonTimelineStart}
                    onChange={handleDateChange}
                  />
                </div>
              </div>
            </div>

            <OrderList
              orders={filteredOrders}
              expandedIds={expandedOrderIds}
              canEdit={isTechnolog}
              onToggleOrder={handleToggleOrder}
              onSelectOperation={handleSelectOperation}
              onEditOrder={(order) => openOrderForEdit(order.id)}
              onEditOperation={handleEditOperationClick} 
              activeOrderId={activeOrderId}
              activeOperationId={activeOperationId}
              timelineStartByOrder={timelineStartByOrder}
              onTimelineStartChange={(_, date) => setCommonTimelineStart(date)}
              daysRange={ganttPeriod} 
              currentUser={user}
              onInitiateStart={handleInitiateStart}
              onInitiateFinish={handleInitiateFinish}
            />
          </div>
        </section>
      </div>

      {isLoginModalOpen && <LoginModal onClose={() => setIsLoginModalOpen(false)} onLogin={login} />}
      
      {isCreateModalOpen && (
        <Modal 
            title="Новый заказ" 
            onClose={() => setIsCreateModalOpen(false)} 
            onSubmit={handleConfirmCreateOrder}
            isSubmitDisabled={!newOrderData.title.trim() || !newOrderData.deadline}
        >
             {/* ... поля формы ... */}
             <div className={styles.formGroup}>
                <label className={styles.formLabel}>Название заказа <span style={{color: 'red'}}>*</span></label>
                <input className={styles.formInput} value={newOrderData.title} onChange={(e) => setNewOrderData({...newOrderData, title: e.target.value})} autoFocus />
             </div>
             <div className={styles.formGroup}>
                <label className={styles.formLabel}>Дедлайн <span style={{color: 'red'}}>*</span></label>
                <input type="date" className={styles.formInput} value={newOrderData.deadline} onChange={(e) => setNewOrderData({...newOrderData, deadline: e.target.value})} />
             </div>
             <div className={styles.formGroup}>
                <label className={styles.formLabel}>Мастер по умолчанию</label>
                <select className={styles.formInput} value={newOrderData.defaultMasterId} onChange={(e) => setNewOrderData({...newOrderData, defaultMasterId: e.target.value})}>
                    <option value="">-- Не назначен --</option>
                    {mastersList.map(m => <option key={m.id} value={m.id}>{m.full_name || m.username}</option>)}
                </select>
             </div>
             <div className={styles.formGroup}>
                <label className={styles.formLabel}>Описание</label>
                <textarea className={styles.formInput} style={{minHeight: "100px"}} value={newOrderData.description} onChange={(e) => setNewOrderData({...newOrderData, description: e.target.value})} />
             </div>
        </Modal>
      )}
      {isWorkshopModalOpen && (
        <AddWorkshopModal 
            onClose={() => setIsWorkshopModalOpen(false)} 
        />
      )}

      <StartOperationModal 
          isOpen={!!opToStart}
          operation={opToStart || {}}
          onClose={() => setOpToStart(null)}
          onConfirm={handleConfirmStart}
      />

      {opToFinish && createPortal(
          <div style={{position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000}} onClick={() => setOpToFinish(null)}>
            <div style={{background: 'white', padding: '24px', borderRadius: '12px', width: '400px'}} onClick={e => e.stopPropagation()}>
              <h3 style={{marginTop: 0}}>Завершение операции</h3>
              <p>Подтвердите выполнение операции <strong>"{opToFinish.name}"</strong></p>
              <div style={{display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px'}}>
                <button onClick={() => setOpToFinish(null)} style={{padding: '8px 16px', borderRadius: '8px', border: '1px solid #ccc', background: 'white', cursor: 'pointer'}}>Отмена</button>
                <button onClick={handleConfirmFinish} style={{padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#22c55e', color: 'white', cursor: 'pointer', fontWeight: 'bold'}}>Завершить</button>
              </div>
            </div>
          </div>,
          document.body
      )}
    </div>
  );
};

export default MainPage;