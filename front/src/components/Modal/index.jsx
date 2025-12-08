import styles from './Modal.module.css';

const Modal = ({ title, onClose, onSubmit, submitLabel = 'Сохранить', children, isSubmitDisabled }) => {
  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div
        className={styles.modal}
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <div className={styles.header}>
          <span>{title}</span>
          <button className={styles.closeButton} onClick={onClose} aria-label="Закрыть">
            ×
          </button>
        </div>
        <div className={styles.content}>{children}</div>
        <div className={styles.actions}>
          <button className={`${styles.button} ${styles.secondary}`} onClick={onClose}>
            Отмена
          </button>
          <button
            className={`${styles.button} ${styles.primary}`}
            onClick={onSubmit}
            disabled={isSubmitDisabled}
          >
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Modal;

