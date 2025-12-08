import { createPortal } from 'react-dom';
import styles from '../pages/OrderFormPage.module.css'; // Используем те же стили или вынесите в отдельный CSS

const DeleteConfirmModal = ({ isOpen, itemName, onConfirm, onCancel }) => {
    if (!isOpen) return null;

    return createPortal(
        <div className={styles.modalOverlay} onClick={onCancel}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                <h3 className={styles.modalTitle}>Удаление операции</h3>
                <p className={styles.modalText}>
                    Вы действительно хотите удалить операцию <strong>"{itemName || 'Без названия'}"</strong>?
                    <br />
                    Это действие необратимо.
                </p>
                <div className={styles.modalActions}>
                    <button className={styles.modalCancelButton} onClick={onCancel}>
                        Отмена
                    </button>
                    <button className={styles.modalDeleteButton} onClick={onConfirm}>
                        Удалить
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default DeleteConfirmModal;