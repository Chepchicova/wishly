import { formatGiftPrice, resolveGiftImageUrl } from '../utils/giftDisplay';
import './WishlistsPage.css';

export default function WishlistsPage({
  searchText,
  onSearchTextChange,
  isWishlistsLoading,
  visibleWishlists,
  selectedWishlist,
  onSelectWishlist,
  wishlistsMessage,
  currentUser,
  onOpenLogin,
  isMenuOpen,
  onToggleWishlistMenu,
  wishlistDotsMenuRef,
  onRequestDeleteWishlist,
  onCloseWishlistMenu,
}) {
  return (
    <section className="wishlists-page">
      <div className="wishlists-head">
        <div>
          <h1 className="wishlists-title">Мои списки желаний</h1>
          <p className="wishlists-subtitle">Создавайте и организуйте свои списки желаний</p>
        </div>
        {currentUser ? (
          <a href="/wishlists/new" className="action-btn primary-btn wishlists-new-link">
            + Новый список желаний
          </a>
        ) : (
          <button type="button" className="action-btn primary-btn" onClick={onOpenLogin}>
            + Новый список желаний
          </button>
        )}
      </div>

      <div className="wishlists-panel glass-bar">
        <aside className="wishlist-sidebar">
          <label className="search-wrap" htmlFor="wishlist-search">
            <span className="material-symbols-outlined search-field-icon" aria-hidden>
              search
            </span>
            <input
              id="wishlist-search"
              type="search"
              placeholder="Поиск списка желаний по названию"
              value={searchText}
              onChange={(event) => onSearchTextChange(event.target.value)}
            />
          </label>

          <div className="wishlist-list">
            {isWishlistsLoading ? (
              <div className="empty-note">Загрузка...</div>
            ) : visibleWishlists.length === 0 ? (
              <div className="empty-note">Списки не найдены</div>
            ) : (
              visibleWishlists.map((wishlist) => (
                <button
                  type="button"
                  key={wishlist.id}
                  className={`wishlist-chip${selectedWishlist?.id === wishlist.id ? ' is-selected' : ''}`}
                  onClick={() => {
                    onSelectWishlist(wishlist.id);
                  }}
                >
                  <img
                    src={wishlist.icon}
                    alt=""
                    className="chip-icon wishlist-icon-png"
                    width={28}
                    height={28}
                  />
                  <span className="chip-meta">
                    <strong>{wishlist.title}</strong>
                    <small>{wishlist.wishes.length} пожеланий</small>
                  </span>
                </button>
              ))
            )}
          </div>
        </aside>

        <section className="wishlist-content">
          {selectedWishlist ? (
            <>
              <header className="wishlist-content-head">
                <div className="content-main-meta">
                  <img
                    src={selectedWishlist.icon}
                    alt=""
                    className="content-icon wishlist-icon-png"
                    width={36}
                    height={36}
                  />
                  <div>
                    <h2>{selectedWishlist.title}</h2>
                    <p>{selectedWishlist.description}</p>
                    {selectedWishlist.eventDate && (
                      <small className="event-date">Событие: {selectedWishlist.eventDate}</small>
                    )}
                  </div>
                </div>

                <div className="content-actions">
                  {currentUser ? (
                    <a
                      href={`/wishlists/gifts/new?list=${selectedWishlist.id}`}
                      className="action-btn action-btn--inline-icon"
                    >
                      <span className="action-btn__icon" aria-hidden>
                        +
                      </span>
                      <span>Добавить подарок</span>
                    </a>
                  ) : (
                    <button type="button" className="action-btn action-btn--inline-icon" onClick={onOpenLogin}>
                      <span className="action-btn__icon" aria-hidden>
                        +
                      </span>
                      <span>Добавить подарок</span>
                    </button>
                  )}
                  <div className="dots-menu-wrap" ref={wishlistDotsMenuRef}>
                    <button
                      type="button"
                      className="dots-btn"
                      aria-label="Настройки списка желаний"
                      onClick={onToggleWishlistMenu}
                    >
                      ...
                    </button>
                    {isMenuOpen && (
                      <div className="dots-menu" role="menu">
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            onCloseWishlistMenu();
                            window.location.assign(`/wishlists/${selectedWishlist.id}/edit`);
                          }}
                        >
                          Редактировать
                        </button>
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => onRequestDeleteWishlist(selectedWishlist)}
                        >
                          Удалить
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </header>

              <div className="wishes-grid">
                {selectedWishlist.wishes.length === 0 ? (
                  <div className="wishes-grid__empty empty-note">В этом списке пока нет подарков</div>
                ) : (
                  selectedWishlist.wishes.map((wish) => {
                    const priceLabel = formatGiftPrice(wish.price);
                    const giftId = String(wish.giftId || wish.id || '').replace(/^gift_/, '');
                    return (
                      <a
                        className="wish-card wish-card-link"
                        href={`/wishlists/gifts/${giftId}?list=${selectedWishlist.id}`}
                        key={wish.id}
                      >
                        <article className="wish-card__inner">
                          <div className="wish-card__image-wrap">
                            <img
                              src={resolveGiftImageUrl(wish.imagePath)}
                              alt=""
                              className="wish-card__image"
                              loading="lazy"
                            />
                          </div>
                          <div className="wish-card__body">
                            <h3 className="wish-card__title">{wish.title}</h3>
                            {wish.note ? <p className="wish-card__desc">{wish.note}</p> : null}
                            {priceLabel ? (
                              <p className="wish-card__price">{priceLabel}</p>
                            ) : (
                              <span className="wish-card__price-spacer" aria-hidden />
                            )}
                          </div>
                        </article>
                      </a>
                    );
                  })
                )}
              </div>
            </>
          ) : (
            <div className="empty-note empty-content">Выберите список желаний слева</div>
          )}
          {wishlistsMessage && <div className="empty-note">{wishlistsMessage}</div>}
        </section>
      </div>
    </section>
  );
}
