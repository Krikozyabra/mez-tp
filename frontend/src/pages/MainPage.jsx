import { useMemo, useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import styles from "./MainPage.module.css";
import SearchBar from "../components/SearchBar";
import OrderList from "../components/OrderList";
import ExecutorList from "../components/ExecutorList";
import Modal from "../components/Modal";
import LoginModal from "../components/LoginModal";
import OrderFormPage from "./OrderFormPage";
import StartOperationModal from "../components/StartOperationModal";
import AddWorkshopModal from "../components/AddWorkshopModal";
import AddExecutorModal from "../components/AddExecutorModal";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/api";
import {
  mapBackendDetailToForm,
  mapBackendListToFrontend,
  mapExecutorAggregationToFrontend
} from "../utils/mappers";
import { formatDateInputValue } from "../utils/dateUtils";

const MainPage = ({ onCreateOrder }) => {
  const { user, role, isAuthenticated, login, logout, hasPermission } = useAuth();

  // --- Состояния данных ---
  const [orders, setOrders] = useState([]);
  const [mastersList, setMastersList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const isTechnolog = hasPermission(["technolog"]);
  const isMaster = role === 'master';

  // --- Состояния UI ---
  const [isOrderFormOpen, setIsOrderFormOpen] = useState(false);
  const [isWorkshopModalOpen, setIsWorkshopModalOpen] = useState(false);
  const [isExecutorModalOpen, setIsExecutorModalOpen] = useState(false);
  const [orderForEdit, setOrderForEdit] = useState(null);
  const [isFetchingDetails, setIsFetchingDetails] = useState(false);
  const [focusOperationId, setFocusOperationId] = useState(null);
  
  // Фильтры
  const [showMyOnly, setShowMyOnly] = useState(false);
  const [showCompleted, setShowCompleted] = useState(true);

  const [viewMode, setViewMode] = useState('orders'); // 'orders' | 'executors'
  const [executorsAggregated, setExecutorsAggregated] = useState([]);
  const [expandedExecutorIds, setExpandedExecutorIds] = useState(new Set());
  
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

  // ... (Вспомогательные функции API и хуки) ...
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

  // === ЗАГРУЗКА ИСПОЛНИТЕЛЕЙ ===
  const fetchExecutorsAggregation = useCallback(async () => {
      setIsLoading(true);
      try {
          const activeOnly = !showCompleted; 
          
          // Передайте аргумент в функцию
          const data = await api.refs.getAggregatedExecutors(activeOnly);
          
          if (data && (Array.isArray(data) || data.results)) { 
             const list = data.results || data;
             const mapped = list.map(mapExecutorAggregationToFrontend);
             setExecutorsAggregated(mapped);
          }
      } catch (error) {
          console.error("Ошибка загрузки исполнителей:", error);
      } finally {
          setIsLoading(false);
      }
  }, [showCompleted]);

  useEffect(() => {
      if (isAuthenticated) {
          if (viewMode === 'orders') {
              fetchOrders();
          } else {
              fetchExecutorsAggregation();
          }
      }
  }, [isAuthenticated, viewMode, showCompleted, fetchOrders, fetchExecutorsAggregation]);

  const handleToggleExecutor = useCallback((id) => {
    setExpandedExecutorIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
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
      }
  }, [isAuthenticated]);


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
      const visibleOperations = order.operations.filter((op) => {
          // 1. Фильтр по выполненным
          const statusMatch = showCompleted ? true : !op.completed;
          
          // 2. Фильтр по мастеру (только если активен чекбокс и роль мастера)
          const masterMatch = (!isMaster || !showMyOnly) ? true : String(op.masterId) === String(user?.id);

          return statusMatch && masterMatch;
      });

      return { ...order, operations: visibleOperations };
    }).filter(order => {
        // Показываем заказ, если в нем остались операции, подходящие под фильтры
        // Либо если фильтры "мягкие" (показывать всё), то показываем и пустые заказы (опционально)
        // Здесь логика: если операции есть - показываем.
        return order.operations.length > 0;
    });
  }, [orders, searchTerm, showCompleted, showMyOnly, isMaster, user]);

  const filteredExecutors = useMemo(() => {
      const lowerTerm = searchTerm.toLowerCase();

      return executorsAggregated.map((executor) => {
          const isExecutorNameMatch = executor.title.toLowerCase().includes(lowerTerm);

          const visibleOperations = executor.operations.filter((op) => {
              // А) Статус
              const isStatusVisible = showCompleted ? true : !op.completed;

              // Б) Поиск
              const isSearchMatch = isExecutorNameMatch || 
                                    op.name.toLowerCase().includes(lowerTerm) || 
                                    (op.orderTitle && op.orderTitle.toLowerCase().includes(lowerTerm));
                                    
              // В) Мастер (Только мои)
              const isMasterMatch = (!isMaster || !showMyOnly) ? true : String(op.masterId) === String(user?.id);

              return isStatusVisible && isSearchMatch && isMasterMatch;
          });

          return {
              ...executor,
              operations: visibleOperations,
              activeTasks: visibleOperations.filter(o => !o.completed).length,
              totalTasks: visibleOperations.length
          };
      })
      .filter((executor) => executor.operations.length > 0);

  }, [executorsAggregated, searchTerm, showCompleted, showMyOnly, isMaster, user]);

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
          // Обновляем данные в зависимости от режима просмотра
          if (viewMode === 'orders') await fetchOrders();
          else await fetchExecutorsAggregation();
      } catch (e) { alert("Ошибка старта: " + e.message); }
      finally { setOpToStart(null); }
  };

  const handleConfirmFinish = async () => {
      if (!opToFinish) return;
      try {
          await api.operations.end(opToFinish.id);
          // Обновляем данные в зависимости от режима просмотра
          if (viewMode === 'orders') await fetchOrders();
          else await fetchExecutorsAggregation();
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
    
    if (viewMode === 'orders') await fetchOrders();
    else await fetchExecutorsAggregation();
    
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
    if (viewMode === 'orders') await fetchOrders();
    else await fetchExecutorsAggregation();
    
    await fetchTimelineStart();
    handleCloseOrderForm();
  };

  const handleOrderDeleted = async () => {
    setIsOrderFormOpen(false);
    setOrderForEdit(null);
    updateUrlParams(null);
    if (viewMode === 'orders') await fetchOrders();
    else await fetchExecutorsAggregation();
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
            
            {/* === ХЕДЕР ТАБЛИЦЫ === */}
            <div className={styles.ordersHeader}>
              
              {/* ВЕРХНЯЯ СТРОКА */}
              <div className={styles.headerTopRow}>
                <div className={styles.headerLeftGroup}>
                    {/* Переключатель */}
                    <div className={styles.viewToggle}>
                        <button 
                            className={`${styles.toggleBtn} ${viewMode === 'orders' ? styles.toggleBtnActive : ''}`}
                            onClick={() => setViewMode('orders')}
                        >
                            Заказы
                        </button>
                        <button 
                            className={`${styles.toggleBtn} ${viewMode === 'executors' ? styles.toggleBtnActive : ''}`}
                            onClick={() => setViewMode('executors')}
                        >
                            Исполнители
                        </button>
                    </div>
                    {isLoading && <span style={{fontSize: "13px", color: "#94a3b8", marginLeft: '8px'}}>Загрузка...</span>}
                </div>

                <div className={styles.headerActionsGroup}>
                    {isTechnolog && (
                        <>
                            <button className={styles.createButtonSmall} onClick={handleCreateOrderClick}>
                                + Заказ
                            </button>
                            <button className={`${styles.createButtonSmall} ${styles.btnBlue}`} onClick={() => setIsWorkshopModalOpen(true)}>
                                + Цех
                            </button>
                            <button className={`${styles.createButtonSmall} ${styles.btnPurple}`} onClick={() => setIsExecutorModalOpen(true)}>
                                + Исполнитель
                            </button>
                        </>
                    )}
                </div>
              </div>

              {/* СТРОКА 2: Фильтры и настройки */}
              <div className={styles.headerBottomRow}>
                <label className={styles.checkboxLabel}>
                  <input type="checkbox" checked={showCompleted} onChange={(e) => setShowCompleted(e.target.checked)} />
                  Показывать выполненные
                </label>

                {isMaster && (
                    <label className={styles.checkboxLabel}>
                        <input type="checkbox" checked={showMyOnly} onChange={(e) => setShowMyOnly(e.target.checked)} />
                        Только мои
                    </label>
                )}
                
                <div className={styles.controlItem}>
                   <label>Масштаб:</label>
                   <select 
                      className={styles.controlInput} 
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

                <div className={styles.controlItem}>
                  <label htmlFor="global-timeline-start">Начало:</label>
                  <input
                    id="global-timeline-start"
                    type="date"
                    className={styles.controlInput}
                    value={commonTimelineStart}
                    onChange={handleDateChange}
                  />
                </div>
              </div>
            </div>
            {/* === КОНЕЦ ХЕДЕРА === */}

            {viewMode === 'orders' ? (
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
            ) : (
                <ExecutorList 
                    executors={filteredExecutors}
                    expandedIds={expandedExecutorIds}
                    onToggleExecutor={handleToggleExecutor}
                    commonTimelineStart={commonTimelineStart}
                    daysRange={ganttPeriod}
                    onEditOperation={handleEditOperationClick} 
                    currentUser={user}
                    onInitiateStart={handleInitiateStart}
                    onInitiateFinish={handleInitiateFinish}
                />
            )}
          </div>
        </section>
      </div>

      {isLoginModalOpen && <LoginModal onClose={() => setIsLoginModalOpen(false)} onLogin={login} />}
      
      {/* ... (Модалки: CreateOrder, Workshop, Executor, Start, Finish) - ОСТАЮТСЯ БЕЗ ИЗМЕНЕНИЙ ... */}
      {/* (Код модалок ниже просто копируется из старой версии, он не менялся) */}
      {isCreateModalOpen && (
        <Modal 
            title="Новый заказ" 
            onClose={() => setIsCreateModalOpen(false)} 
            onSubmit={handleConfirmCreateOrder}
            isSubmitDisabled={!newOrderData.title.trim() || !newOrderData.deadline}
        >
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
      {isWorkshopModalOpen && <AddWorkshopModal onClose={() => setIsWorkshopModalOpen(false)} />}
      {isExecutorModalOpen && <AddExecutorModal onClose={() => setIsExecutorModalOpen(false)} />}
      <StartOperationModal isOpen={!!opToStart} operation={opToStart || {}} onClose={() => setOpToStart(null)} onConfirm={handleConfirmStart} />
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