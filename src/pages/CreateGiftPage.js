import './ProfilePage.css';
import './CreateWishlistPage.css';
import './CreateGiftPage.css';

export default function CreateGiftPage({
  currentUser,
  onOpenLogin,
  createGiftForm,
  onCreateGiftFormChange,
  onToggleGiftWishlist,
  onSubmitCreateGift,
  createGiftMessage,
  isCreateGiftSubmitting,
  userWishlists,
  onGiftImageChange,
  pageTitle = 'Новый подарок',
  pageSubtitle = 'Заполните поля и добавьте подарок в один или несколько списков',
  submitLabel = 'Добавить подарок',
  guestMessage = 'Чтобы добавить подарок, войдите в аккаунт.',
  cancelHref = '/wishlists',
  onCancel,
}) {
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
          <form className="wishlist-create-form profile-edit-form" onSubmit={onSubmitCreateGift}>
            <label>
              <span className="form-label-row">
                Название <span className="field-required">*</span>
              </span>
              <input
                required
                maxLength={200}
                value={createGiftForm.title}
                onChange={(event) =>
                  onCreateGiftFormChange({ ...createGiftForm, title: event.target.value })
                }
                placeholder="Например: Книга «…»"
              />
            </label>

            <label>
              Описание
              <textarea
                rows={5}
                value={createGiftForm.description}
                onChange={(event) =>
                  onCreateGiftFormChange({ ...createGiftForm, description: event.target.value })
                }
                placeholder="Пожелания по цвету, размеру, магазину"
              />
            </label>

            <label>
              <span className="form-label-row">Цена, BYN</span>
              <input
                type="text"
                inputMode="decimal"
                value={createGiftForm.price}
                onChange={(event) =>
                  onCreateGiftFormChange({ ...createGiftForm, price: event.target.value })
                }
                placeholder="Например: 29,99"
              />
            </label>

            <label>
              <span className="form-label-row">Ссылка на товар</span>
              <input
                type="url"
                value={createGiftForm.url}
                onChange={(event) =>
                  onCreateGiftFormChange({ ...createGiftForm, url: event.target.value })
                }
                placeholder="https://"
              />
            </label>

            <label>
              <span className="form-label-row">Фото подарка</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={onGiftImageChange}
              />
            </label>

            {createGiftForm.imageDataUrl ? (
              <div className="create-gift-image-preview">
                <img src={createGiftForm.imageDataUrl} alt="" className="create-gift-image-preview__img" />
              </div>
            ) : null}

            <fieldset className="create-gift-wishlists-field">
              <legend className="form-label-row">
                Добавить в списки <span className="field-required">*</span>
              </legend>
              {userWishlists.length === 0 ? (
                <p className="create-gift-no-wishlists wishlist-create-message wishlist-create-message--muted">
                  У вас пока нет списков желаний.{' '}
                  <a href="/wishlists/new" className="create-wishlist-inline-link">
                    Создать список
                  </a>
                </p>
              ) : (
                <ul className="create-gift-wishlist-list">
                  {userWishlists.map((wl) => (
                    <li key={wl.id} className="create-gift-wishlist-item">
                      <label className="create-gift-checkbox-label">
                        <input
                          type="checkbox"
                          checked={createGiftForm.selectedWishlistIds.includes(wl.id)}
                          onChange={() => onToggleGiftWishlist(wl.id)}
                        />
                        <span className="create-gift-wishlist-title">{wl.title}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </fieldset>

            <div className="profile-form-actions">
              <button type="submit" className="action-btn primary-btn" disabled={isCreateGiftSubmitting}>
                {isCreateGiftSubmitting ? 'Сохранение…' : submitLabel}
              </button>
              {typeof onCancel === 'function' ? (
                <button type="button" className="action-btn" onClick={onCancel}>
                  Отмена
                </button>
              ) : (
                <a href={cancelHref} className="action-btn">
                  Отмена
                </a>
              )}
            </div>

            {createGiftMessage ? (
              <p className="wishlist-create-message" role="alert">
                {createGiftMessage}
              </p>
            ) : null}
          </form>
        )}
      </div>
    </section>
  );
}
