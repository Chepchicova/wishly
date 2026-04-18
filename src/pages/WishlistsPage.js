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
}) {
  return (
    <section className="wishlists-page">
      <div className="wishlists-head">
        <div>
          <h1 className="wishlists-title">Мои вишлисты</h1>
          <p className="wishlists-subtitle">Создавайте и организуйте свои списки желаний</p>
        </div>
        {currentUser ? (
          <a href="/wishlists/new" className="action-btn primary-btn wishlists-new-link">
            + Новый вишлист
          </a>
        ) : (
          <button type="button" className="action-btn primary-btn" onClick={onOpenLogin}>
            + Новый вишлист
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
              placeholder="Поиск вишлиста по названию"
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
                  <button type="button" className="action-btn">
                    + Добавить желание
                  </button>
                  <div className="dots-menu-wrap" ref={wishlistDotsMenuRef}>
                    <button
                      type="button"
                      className="dots-btn"
                      aria-label="Настройки вишлиста"
                      onClick={onToggleWishlistMenu}
                    >
                      ...
                    </button>
                    {isMenuOpen && (
                      <div className="dots-menu" role="menu">
                        <button type="button" role="menuitem">
                          Редактировать
                        </button>
                        <button type="button" role="menuitem">
                          Удалить
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </header>

              <div className="wishes-list">
                {selectedWishlist.wishes.map((wish) => (
                  <article className="wish-row" key={wish.id}>
                    <h3>{wish.title}</h3>
                    <p>{wish.note}</p>
                  </article>
                ))}
              </div>
            </>
          ) : (
            <div className="empty-note empty-content">Выберите вишлист в левом списке</div>
          )}
          {wishlistsMessage && <div className="empty-note">{wishlistsMessage}</div>}
        </section>
      </div>
    </section>
  );
}
