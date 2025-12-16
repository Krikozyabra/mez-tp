import { useState } from "react";
import { createPortal } from "react-dom";
import styles from "./ControlPanel.module.css";
import StartOperationModal from "../StartOperationModal"; // Импорт новой модалки

const ControlPanel = ({
  operations,
  canControl,
  onOperationClick,
  onStartOperation, // Пропс для старта (MainPage передаст)
  onFinishOperation, // Пропс для завершения (MainPage передаст)
}) => {
  // Состояния для модалок
  const [finishOp, setFinishOp] = useState(null); // Для подтверждения завершения
  const [startOp, setStartOp] = useState(null);   // Для формы старта

  if (!operations || operations.length === 0) {
    return (
      <div className={styles.panel}>
        <div className={styles.header}>
          <h3 className={styles.title}>Мои задачи</h3>
        </div>
        <div className={styles.empty}>Нет активных задач</div>
      </div>
    );
  }

  // Логика кнопки действия
  const handleActionClick = (e, op) => {
    e.stopPropagation();
    if (op.status === 'planned') {
        setStartOp(op);
    } else if (op.status === 'in_progress') {
        setFinishOp(op);
    }
  };

  const handleConfirmFinish = () => {
    if (finishOp && onFinishOperation) {
      onFinishOperation(finishOp.id);
    }
    setFinishOp(null);
  };

  const handleConfirmStart = (opId, workshopId, executorIds) => {
      if (onStartOperation) {
          onStartOperation(opId, workshopId, executorIds);
      }
      setStartOp(null);
  };

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h3 className={styles.title}>
          Мои задачи <span className={styles.count}>{operations.length}</span>
        </h3>
      </div>
      <div className={styles.list}>
        {operations.map((op) => {
          // Определяем статус и текст кнопки
          const isPlanned = op.status === 'planned';
          const isInProgress = op.status === 'in_progress';
          
          let statusBadge = null;
          let actionButton = null;

          if (isPlanned) {
              statusBadge = <span style={{fontSize: '11px', color: '#64748b'}}>Ожидает старта</span>;
              if (canControl) {
                  actionButton = (
                      <button 
                          className={`${styles.controlButton} ${styles.startButton}`}
                          onClick={(e) => handleActionClick(e, op)}
                          title="Начать выполнение"
                      >
                          Начать
                      </button>
                  );
              }
          } else if (isInProgress) {
              statusBadge = <span style={{fontSize: '11px', color: '#3b82f6', fontWeight: 600}}>В работе</span>;
              if (canControl) {
                  actionButton = (
                      <button 
                          className={styles.controlButton}
                          onClick={(e) => handleActionClick(e, op)}
                          title="Завершить операцию"
                      >
                          Завершить
                      </button>
                  );
              }
          }

          return (
            <div
              key={op.id}
              className={styles.item}
              onClick={() => onOperationClick(op)}
            >
              <div className={styles.itemContent}>
                <span className={styles.itemName}>{op.name}</span>
                <span className={styles.itemMeta}>{op.orderTitle}</span>
                {statusBadge}
              </div>

              {actionButton}
              
              {!canControl && (
                <span className={styles.readOnlyBadge}>👁</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Модалка завершения (простое подтверждение) */}
      {finishOp &&
        createPortal(
          <div className={styles.modalOverlay} onClick={() => setFinishOp(null)}>
            <div
              className={styles.modalContent}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className={styles.modalTitle}>Завершение операции</h3>
              <p className={styles.modalText}>
                Вы подтверждаете выполнение операции <strong>"{finishOp.name}"</strong>?
              </p>
              <div className={styles.modalActions}>
                <button
                  className={styles.modalCancelButton}
                  onClick={() => setFinishOp(null)}
                >
                  Отмена
                </button>
                <button
                  className={styles.modalConfirmButton}
                  onClick={handleConfirmFinish}
                >
                  Завершить
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* Модалка старта (с формой) */}
        <StartOperationModal 
            isOpen={!!startOp}
            operation={startOp || {}}
            onClose={() => setStartOp(null)}
            onConfirm={handleConfirmStart}
        />
    </div>
  );
};

export default ControlPanel;