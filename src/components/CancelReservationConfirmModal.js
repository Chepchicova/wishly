import './AuthModal.css';
import './DeleteWishlistConfirmModal.css';

export default function CancelReservationConfirmModal({
  onClose,
  onConfirm,
  isSubmitting,
  errorMessage,
}) {
  return (
    <div className="auth-modal-backdrop delete-wishlist-modal-backdrop" onClick={onClose}>
      <section
        className="auth-modal delete-wishlist-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancel-reservation-modal-title"
      >
        <button
          type="button"
          className="delete-wishlist-modal__close"
          onClick={onClose}
          disabled={isSubmitting}
          aria-label="Закрыть"
        >
          ×
        </button>
        <h2 id="cancel-reservation-modal-title" className="delete-wishlist-modal__title">
          Отменить бронирование?
        </h2>
        <p className="delete-wishlist-modal__text">
          Вы уверены, что хотите снять бронь с этого подарка? Подарок снова станет доступен для брони
          другим.
        </p>
        <div className="delete-wishlist-modal__actions">
          <button
            type="button"
            className="action-btn delete-wishlist-modal__btn-cancel"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Нет, оставить
          </button>
          <button
            type="button"
            className="action-btn delete-wishlist-modal__btn-delete"
            onClick={onConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Снятие…' : 'Да, снять бронь'}
          </button>
        </div>
        {errorMessage ? <p className="delete-wishlist-modal__error">{errorMessage}</p> : null}
      </section>
    </div>
  );
}
