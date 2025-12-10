import { useState } from "react";
import { createPortal } from "react-dom"; // Для модального окна
import styles from "./ControlPanel.module.css";

const ControlPanel = ({
  operations,
  canControl,
  onOperationClick,
  onConfirmControl, // <--- Новый пропс: функция подтверждения
}) => {
  // Состояние для модального окна
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOp, setSelectedOp] = useState(null);

  if (!operations || operations.length === 0) {
    return (
      <div className={styles.panel}>
        <div className={styles.header}>
          <h3 className={styles.title}>На контроль</h3>
        </div>
        <div className={styles.empty}>Нет операций</div>
      </div>
    );
  }

  // Открытие модального окна
  const handleInitiateControl = (e, op) => {
    e.stopPropagation(); // Чтобы не сработал клик по карточке
    setSelectedOp(op);
    setIsModalOpen(true);
  };

  // Подтверждение
  const handleConfirm = () => {
    if (selectedOp && onConfirmControl) {
      onConfirmControl(selectedOp.id);
    }
    setIsModalOpen(false);
    setSelectedOp(null);
  };

  // Отмена
  const handleCancel = () => {
    setIsModalOpen(false);
    setSelectedOp(null);
  };

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h3 className={styles.title}>
          На контроль <span className={styles.count}>{operations.length}</span>
        </h3>
      </div>
      <div className={styles.list}>
        {operations.map((op) => (
          <div
            key={op.id}
            className={styles.item}
            onClick={() => onOperationClick(op)}
          >
            <div className={styles.itemContent}>
              <span className={styles.itemName}>{op.name}</span>
              <span className={styles.itemMeta}>{op.orderTitle}</span>
            </div>

            {/* Если canControl === false (обычный юзер), кнопка не рендерится */}
            {canControl && (
              <button
                className={styles.controlButton}
                onClick={(e) => handleInitiateControl(e, op)}
              >
                Контроль
              </button>
            )}
            {!canControl && (
              <span className={styles.readOnlyBadge}>Просмотр</span>
            )}
          </div>
        ))}
      </div>

      {/* Модальное окно подтверждения (через Портал) */}
      {isModalOpen &&
        createPortal(
          <div className={styles.modalOverlay} onClick={handleCancel}>
            <div
              className={styles.modalContent}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className={styles.modalTitle}>Подтверждение контроля</h3>
              <p className={styles.modalText}>
                Вы подтверждаете выполнение операции{" "}
                <strong>"{selectedOp?.name}"</strong>?
                <br />
                Операция будет отмечена как завершенная.
              </p>
              <div className={styles.modalActions}>
                <button
                  className={styles.modalCancelButton}
                  onClick={handleCancel}
                >
                  Отмена
                </button>
                <button
                  className={styles.modalConfirmButton}
                  onClick={handleConfirm}
                >
                  Подтвердить
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default ControlPanel;
