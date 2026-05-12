import EventDatePicker from '../components/EventDatePicker';
import { getWishlistIconUrl, wishlistIconOptions } from '../constants/wishlistIcons';
import './ProfilePage.css';
import './CreateGiftPage.css';
import './CreateWishlistPage.css';

const PRIVACY_OPTIONS = [
  { value: 'private', label: 'Приватный', hint: 'Видите список только вы.' },
  { value: 'public', label: 'Публичный', hint: 'Список могут видеть другие пользователи (по правилам приложения).' },
  { value: 'friends_all', label: 'Для друзей', hint: 'Доступен всем, кто у вас в друзьях.' },
  {
    value: 'friends_selected',
    label: 'Только выбранные друзья',
    hint: 'Отметьте, кому именно показывать этот список.',
  },
];

const RESERVATION_DISPLAY_OPTIONS = [
  {
    value: 'hidden',
    label: 'Не показывать бронирования',
    hint: 'В списке не будет видно, что подарок забронирован.',
  },
  {
    value: 'show_without_name',
    label: 'Показывать без имени',
    hint: 'Для забронированных подарков отображается только «Забронировано».',
  },
  {
    value: 'show_with_name',
    label: 'Показывать с именем',
    hint: 'Видно, кто забронировал подарок.',
  },
];

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
  privacyFriendsList,
  isPrivacyFriendsLoading,
  onSetWishlistPrivacyMode,
  onToggleWishlistPrivacyFriend,
  onSetWishlistReservationDisplay,
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
      <section className="profile-page create-wishlist-page create-gift-page">
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
      <section className="profile-page create-wishlist-page create-gift-page">
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
    <section className="profile-page create-wishlist-page create-gift-page">
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

            <fieldset className="create-gift-wishlists-field">
              <legend className="form-label-row">Кто видит список</legend>
              <ul className="create-gift-wishlist-list" role="radiogroup" aria-label="Уровень доступа к списку">
                {PRIVACY_OPTIONS.map((opt) => (
                  <li key={opt.value} className="create-gift-wishlist-item">
                    <label className="create-gift-checkbox-label">
                      <input
                        type="radio"
                        name="wishlist-privacy-mode"
                        value={opt.value}
                        checked={createWishlistForm.privacyMode === opt.value}
                        onChange={() => onSetWishlistPrivacyMode(opt.value)}
                      />
                      <span className="create-gift-wishlist-title create-gift-wishlist-title--stacked">
                        <span className="wishlist-privacy-row-label">{opt.label}</span>
                        <span className="wishlist-privacy-row-hint">{opt.hint}</span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </fieldset>

            {createWishlistForm.privacyMode === 'friends_selected' ? (
              <fieldset className="create-gift-wishlists-field">
                <legend className="form-label-row">
                  Кому виден список <span className="field-required">*</span>
                </legend>
                {isPrivacyFriendsLoading ? (
                  <p className="create-gift-no-wishlists wishlist-create-message wishlist-create-message--muted">
                    Загрузка списка друзей…
                  </p>
                ) : privacyFriendsList.length === 0 ? (
                  <p className="create-gift-no-wishlists wishlist-create-message wishlist-create-message--muted">
                    У вас пока нет друзей.{' '}
                    <a href="/friends" className="create-wishlist-inline-link">
                      Добавить друзей
                    </a>
                  </p>
                ) : (
                  <ul className="create-gift-wishlist-list">
                    {privacyFriendsList.map((friend) => {
                      const uid = friend.id_user;
                      const checked = createWishlistForm.allowedFriendIdUsers.some(
                        (x) => Number(x) === Number(uid)
                      );
                      return (
                        <li key={friend.id} className="create-gift-wishlist-item">
                          <label className="create-gift-checkbox-label">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => onToggleWishlistPrivacyFriend(uid)}
                            />
                            <span className="create-gift-wishlist-title create-gift-wishlist-title--stacked">
                              <span className="wishlist-privacy-row-label">{friend.name}</span>
                              <span className="wishlist-privacy-row-hint">id {uid}</span>
                            </span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </fieldset>
            ) : null}

            <fieldset className="create-gift-wishlists-field">
              <legend className="form-label-row">Как показывать бронирования в списке</legend>
              <ul
                className="create-gift-wishlist-list"
                role="radiogroup"
                aria-label="Отображение бронирований подарков"
              >
                {RESERVATION_DISPLAY_OPTIONS.map((opt) => (
                  <li key={opt.value} className="create-gift-wishlist-item">
                    <label className="create-gift-checkbox-label">
                      <input
                        type="radio"
                        name="wishlist-reservation-display"
                        value={opt.value}
                        checked={createWishlistForm.reservationDisplay === opt.value}
                        onChange={() => onSetWishlistReservationDisplay(opt.value)}
                      />
                      <span className="create-gift-wishlist-title create-gift-wishlist-title--stacked">
                        <span className="wishlist-privacy-row-label">{opt.label}</span>
                        <span className="wishlist-privacy-row-hint">{opt.hint}</span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </fieldset>

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
