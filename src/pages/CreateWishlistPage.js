import EventDatePicker from '../components/EventDatePicker';
import { getWishlistIconUrl, wishlistIconOptions } from '../constants/wishlistIcons';
import './ProfilePage.css';
import './CreateWishlistPage.css';

export default function CreateWishlistPage({
  currentUser,
  onOpenLogin,
  wishlistFormIsEdit,
  wishlistFormEditState,
  createWishlistForm,
  onCreateWishlistFormChange,
  onSubmitCreateWishlist,
  createWishlistMessage,
  isCreateWishlistSubmitting,
  wishlistIconPickerRef,
  onSelectWishlistIcon,
  onOpenPrivacyModal,
}) {
  const pageTitle = wishlistFormIsEdit ? 'Редактировать список желаний' : 'Новый список желаний';
  const pageSubtitle = wishlistFormIsEdit
    ? 'Измените поля и сохраните список'
    : 'Заполните поля и сохраните список';
  const guestMessage = wishlistFormIsEdit
    ? 'Чтобы редактировать список желаний, войдите в аккаунт.'
    : 'Чтобы создать список желаний, войдите в аккаунт.';
  const submitLabel = wishlistFormIsEdit ? 'Сохранить изменения' : 'Создать список желаний';

  if (wishlistFormIsEdit && wishlistFormEditState === 'loading') {
    return (
      <section className="profile-page create-wishlist-page">
        <div className="profile-card create-wishlist-inner glass-bar">
          <div className="create-wishlist-head">
            <h1 className="wishlists-title">{pageTitle}</h1>
            <p className="wishlists-subtitle">Загрузка данных…</p>
          </div>
        </div>
      </section>
    );
  }

  if (wishlistFormIsEdit && wishlistFormEditState === 'missing') {
    return (
      <section className="profile-page create-wishlist-page">
        <div className="profile-card create-wishlist-inner glass-bar">
          <div className="create-wishlist-head">
            <h1 className="wishlists-title">Список желаний не найден</h1>
            <p className="wishlists-subtitle">Возможно, список удалён или у вас нет к нему доступа.</p>
          </div>
          <p className="wishlist-create-message wishlist-create-message--muted">
            <a href="/wishlists" className="create-wishlist-inline-link">
              Вернуться к спискам
            </a>
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="profile-page create-wishlist-page">
      <div className="profile-card create-wishlist-inner glass-bar">
        <div className="create-wishlist-head">
          <h1 className="wishlists-title">{pageTitle}</h1>
          <p className="wishlists-subtitle">{pageSubtitle}</p>
        </div>

        {!currentUser ? (
          <div className="profile-card create-wishlist-guest">
            <p>{guestMessage}</p>
            <button type="button" className="action-btn primary-btn" onClick={onOpenLogin}>
              Войти
            </button>
          </div>
        ) : (
          <form className="wishlist-create-form profile-edit-form" onSubmit={onSubmitCreateWishlist}>
            <label>
              <span className="form-label-row">
                Название <span className="field-required">*</span>
              </span>
              <input
                required
                maxLength={200}
                value={createWishlistForm.title}
                onChange={(event) => onCreateWishlistFormChange({ ...createWishlistForm, title: event.target.value })}
                placeholder="Например: День рождения 2026"
              />
            </label>

            <label>
              Описание
              <textarea
                rows={5}
                value={createWishlistForm.description}
                onChange={(event) =>
                  onCreateWishlistFormChange({ ...createWishlistForm, description: event.target.value })
                }
                placeholder="Опишите, почему этот список важен для вас. Мечты любят подробности"
              />
            </label>

            <label className="wishlist-event-date-label">
              <span className="form-label-row">Дата события</span>
              <EventDatePicker
                id="wishlist-event-date"
                value={createWishlistForm.eventDate}
                onChange={(nextDate) =>
                  onCreateWishlistFormChange({ ...createWishlistForm, eventDate: nextDate })
                }
              />
            </label>

            <div className="wishlist-icon-field">
              <span className="wishlist-icon-field-label">Иконка списка</span>
              <details ref={wishlistIconPickerRef} className="wishlist-icon-details">
                <summary className="wishlist-icon-summary">
                  <img
                    src={getWishlistIconUrl(createWishlistForm.icon)}
                    alt=""
                    className="wishlist-icon-png wishlist-icon-summary-img"
                    width={32}
                    height={32}
                  />
                  <span className="wishlist-icon-summary-text">
                    {wishlistIconOptions.find((o) => o.code === createWishlistForm.icon)?.label || 'Обычный'}
                  </span>
                  <span className="wishlist-icon-chevron" aria-hidden>
                    ▾
                  </span>
                </summary>
                <div className="wishlist-icon-grid" role="listbox" aria-label="Выбор иконки">
                  {wishlistIconOptions.map(({ code, label }) => (
                    <button
                      key={code}
                      type="button"
                      className={`wishlist-icon-option${createWishlistForm.icon === code ? ' is-selected' : ''}`}
                      onClick={() => onSelectWishlistIcon(code)}
                      title={label}
                    >
                      <img src={getWishlistIconUrl(code)} alt="" width={40} height={40} />
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              </details>
            </div>

            <button type="button" className="privacy-settings-strip" onClick={onOpenPrivacyModal}>
              <span className="privacy-settings-strip-title">Настройки приватности</span>
              <span className="privacy-settings-strip-hint">Укажите, кто может просматривать ваш список</span>
            </button>

            <div className="profile-form-actions">
              <button type="submit" className="action-btn primary-btn" disabled={isCreateWishlistSubmitting}>
                {isCreateWishlistSubmitting ? 'Сохранение…' : submitLabel}
              </button>
              <a href="/wishlists" className="action-btn">
                Отмена
              </a>
            </div>

            {createWishlistMessage && (
              <p className="wishlist-create-message" role="alert">
                {createWishlistMessage}
              </p>
            )}
          </form>
        )}
      </div>
    </section>
  );
}
