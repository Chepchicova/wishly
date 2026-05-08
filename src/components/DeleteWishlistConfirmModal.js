import './AuthModal.css';
import './DeleteWishlistConfirmModal.css';

export default function DeleteWishlistConfirmModal({
  wishlistTitle,
  onClose,
  onConfirm,
  isDeleting,
  errorMessage,
}) {
  return (
    <div className="auth-modal-backdrop delete-wishlist-modal-backdrop" onClick={onClose}>
      <section
        className="auth-modal delete-wishlist-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-wishlist-modal-title"
      >
        <button type="button" className="delete-wishlist-modal__close" onClick={onClose} aria-label="Закрыть">
          ×
        </button>
        <h2 id="delete-wishlist-modal-title" className="delete-wishlist-modal__title">
          Удаление списка
        </h2>
        <p className="delete-wishlist-modal__text">
          Вы уверены, что хотите удалить список желаний «{wishlistTitle}»? Это действие нельзя отменить.
        </p>
        <div className="delete-wishlist-modal__actions">
          <button
            type="button"
            className="action-btn delete-wishlist-modal__btn-cancel"
            onClick={onClose}
            disabled={isDeleting}
          >
            Отмена
          </button>
          <button
            type="button"
            className="action-btn delete-wishlist-modal__btn-delete"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? 'Удаление…' : 'Удалить'}
          </button>
        </div>
        {errorMessage && <p className="delete-wishlist-modal__error">{errorMessage}</p>}
      </section>
    </div>
  );
}
