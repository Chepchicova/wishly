import './AuthModal.css';
import './DeleteWishlistConfirmModal.css';

export default function DeleteGiftConfirmModal({
  giftTitle,
  onClose,
  onConfirm,
  isDeleting,
  errorMessage,
}) {
  const title = giftTitle && String(giftTitle).trim() ? String(giftTitle).trim() : 'Подарок';
  return (
    <div
      className="auth-modal-backdrop delete-wishlist-modal-backdrop"
      onClick={() => {
        if (!isDeleting) {
          onClose();
        }
      }}
    >
      <section
        className="auth-modal delete-wishlist-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-gift-modal-title"
      >
        <button
          type="button"
          className="delete-wishlist-modal__close"
          onClick={onClose}
          disabled={isDeleting}
          aria-label="Закрыть"
        >
          ×
        </button>
        <h2 id="delete-gift-modal-title" className="delete-wishlist-modal__title">
          Удаление подарка
        </h2>
        <p className="delete-wishlist-modal__text">
          Вы уверены, что хотите удалить подарок «{title}»? Это действие нельзя отменить.
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
        {errorMessage ? <p className="delete-wishlist-modal__error">{errorMessage}</p> : null}
      </section>
    </div>
  );
}
