import './AuthModal.css';
import './DeleteWishlistConfirmModal.css';
import './RemoveFriendConfirmModal.css';

export default function RemoveFriendConfirmModal({
  friendName,
  isLightTheme = false,
  onClose,
  onConfirm,
  isRemoving,
  errorMessage,
}) {
  const label = friendName && String(friendName).trim() ? `«${friendName.trim()}»` : 'этого пользователя';
  const portalRootClass = `remove-friend-confirm-portal${isLightTheme ? ' remove-friend-confirm-portal--light' : ''}`;

  return (
    <div className={portalRootClass}>
      <div
        className="auth-modal-backdrop delete-wishlist-modal-backdrop remove-friend-confirm-backdrop"
        onClick={onClose}
      >
        <section
          className="auth-modal delete-wishlist-modal"
          onClick={(event) => event.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="remove-friend-modal-title"
        >
        <button type="button" className="delete-wishlist-modal__close" onClick={onClose} aria-label="Закрыть">
          ×
        </button>
        <h2 id="remove-friend-modal-title" className="delete-wishlist-modal__title">
          Удаление из друзей
        </h2>
        <p className="delete-wishlist-modal__text">
          Удалить {label} из друзей? Совместный доступ к спискам с ограничением «только выбранным друзьям» будет отозван.
          Позже можно снова отправить заявку в друзья.
        </p>
        <div className="delete-wishlist-modal__actions">
          <button
            type="button"
            className="action-btn delete-wishlist-modal__btn-cancel"
            onClick={onClose}
            disabled={isRemoving}
          >
            Отмена
          </button>
          <button
            type="button"
            className="action-btn delete-wishlist-modal__btn-delete remove-friend-modal__delete-btn"
            onClick={onConfirm}
            disabled={isRemoving}
          >
            {isRemoving ? 'Удаление…' : 'Удалить из друзей'}
          </button>
        </div>
        {errorMessage ? <p className="delete-wishlist-modal__error">{errorMessage}</p> : null}
        </section>
      </div>
    </div>
  );
}
