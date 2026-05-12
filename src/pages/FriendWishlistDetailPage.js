import { formatGiftPrice, resolveGiftImageUrl } from '../utils/giftDisplay';
import './WishlistsPage.css';
import './GiftDetailsPage.css';
import './FriendWishlistDetailPage.css';

export default function FriendWishlistDetailPage({
  currentUser,
  onOpenLogin,
  wishlist,
  ownerIdUser,
  friendLabel,
  isLoading,
  errorKind,
  backHref = '/friends',
}) {
  const mainInner = () => {
    if (!currentUser) {
      return (
        <div className="profile-card create-wishlist-inner glass-bar friend-wl-detail-card">
          <h1 className="wishlists-title">Вход</h1>
          <p className="wishlists-subtitle">Чтобы смотреть списки друзей, войдите в аккаунт.</p>
          <button type="button" className="action-btn primary-btn" onClick={onOpenLogin}>
            Войти
          </button>
        </div>
      );
    }

    if (errorKind === 'no-owner') {
      return (
        <div className="profile-card create-wishlist-inner glass-bar friend-wl-detail-card">
          <h1 className="wishlists-title">Некорректная ссылка</h1>
          <p className="wishlists-subtitle">
            Откройте список со страницы «Друзья» или укажите в URL параметр owner с ID пользователя.
          </p>
        </div>
      );
    }

    if (isLoading) {
      return (
        <div className="profile-card create-wishlist-inner glass-bar friend-wl-detail-card">
          <h1 className="wishlists-title">Загрузка</h1>
          <p className="wishlists-subtitle">Загружаем список…</p>
        </div>
      );
    }

    if (errorKind === 'not-found') {
      return (
        <div className="profile-card create-wishlist-inner glass-bar friend-wl-detail-card">
          <h1 className="wishlists-title">Список недоступен</h1>
          <p className="wishlists-subtitle">
            Не удалось найти список или у вас нет к нему доступа. Вернитесь к списку друзей и откройте список оттуда.
          </p>
        </div>
      );
    }

    if (!wishlist) {
      return (
        <div className="profile-card create-wishlist-inner glass-bar friend-wl-detail-card">
          <h1 className="wishlists-title">Список недоступен</h1>
          <p className="wishlists-subtitle">Попробуйте открыть список снова со страницы «Друзья».</p>
        </div>
      );
    }

    const listQuery = `?list=${encodeURIComponent(wishlist.id)}&owner=${encodeURIComponent(String(ownerIdUser))}`;

    return (
      <div className="profile-card create-wishlist-inner glass-bar friend-wl-detail-card">
        <header className="wishlist-content-head friend-wl-detail-head">
          <div className="content-main-meta">
            <img
              src={wishlist.icon}
              alt=""
              className="content-icon wishlist-icon-png"
              width={40}
              height={40}
            />
            <div>
              <h2>{wishlist.title}</h2>
              {wishlist.description ? <p>{wishlist.description}</p> : null}
              {wishlist.eventDate ? (
                <small className="event-date">Событие: {wishlist.eventDate}</small>
              ) : null}
              {friendLabel ? (
                <p className="friend-wl-detail-owner-line">
                  <span className="friend-wl-detail-owner-label">Владелец:</span> {friendLabel}
                </p>
              ) : null}
            </div>
          </div>
        </header>

        <div className="wishes-grid">
          {wishlist.wishes.length === 0 ? (
            <div className="wishes-grid__empty empty-note">В этом списке пока нет подарков</div>
          ) : (
            wishlist.wishes.map((wish) => {
              const priceLabel = formatGiftPrice(wish.price);
              const giftId = String(wish.giftId || wish.id || '').replace(/^gift_/, '');
              const giftIsReserved = wish.isReserved ?? Boolean(wish.reservationLabel);
              /* Только «Забронировано» / «Исполнено», без имени бронирующего (даже из устаревшего кэша) */
              let reservationBadge = null;
              if (wish.reservationLabel === 'Исполнено' || wish.reservationLabel === 'Подарено') {
                reservationBadge = 'Исполнено';
              } else if (
                wish.reservationLabel &&
                /^забронировано/i.test(String(wish.reservationLabel).split(' ·')[0].trim())
              ) {
                reservationBadge = 'Забронировано';
              } else if (giftIsReserved) {
                reservationBadge = 'Забронировано';
              }
              return (
                <a
                  key={wish.id}
                  className="wish-card wish-card-link"
                  href={`/wishlists/gifts/${giftId}${listQuery}`}
                >
                  {reservationBadge ? (
                    <span className="wish-card__reserved-badge" title={reservationBadge}>
                      {reservationBadge}
                    </span>
                  ) : null}
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
      </div>
    );
  };

  return (
    <section className="profile-page create-wishlist-page gift-details-page friend-wishlist-detail-page">
      <nav className="gift-details-back" aria-label="Навигация по разделу">
        <a href={backHref} className="gift-details-back-link">
          ← Назад к друзьям
        </a>
      </nav>
      <div className="gift-details-page-inner">
        <div className="gift-details-shell friend-wl-detail-shell">{mainInner()}</div>
      </div>
    </section>
  );
}
