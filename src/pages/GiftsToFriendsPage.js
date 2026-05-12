import { formatGiftPrice, resolveGiftImageUrl } from '../utils/giftDisplay';
import './WishlistsPage.css';
import './GiftsToFriendsPage.css';

function buildGiftToFriendHref(row) {
  const gid = encodeURIComponent(String(row.giftId || '').trim());
  const owner = encodeURIComponent(String(row.ownerIdUser));
  const p = new URLSearchParams();
  p.set('owner', owner);
  if (row.wishlistId != null && String(row.wishlistId).trim() !== '') {
    p.set('list', String(Number(row.wishlistId)));
  }
  return `/wishlists/gifts/${gid}?${p.toString()}`;
}

export default function GiftsToFriendsPage({
  currentUser,
  onOpenLogin,
  items = [],
  isLoading = false,
  message = '',
}) {
  return (
    <section className="gifts-to-friends-page">
      <div className="wishlists-head">
        <div>
          <h1 className="wishlists-title">Подарки друзьям</h1>
          <p className="wishlists-subtitle">
            Желания из списков друзей, на которые вы откликнулись: что вы ещё готовите подарить и что друг уже может
            считать полученным.
          </p>
        </div>
        {!currentUser ? (
          <button type="button" className="action-btn primary-btn" onClick={onOpenLogin}>
            Войти
          </button>
        ) : null}
      </div>

      <div className="gifts-to-friends-panel glass-bar">
        {!currentUser ? (
          <p className="empty-note gifts-to-friends-empty">Войдите, чтобы увидеть список.</p>
        ) : isLoading ? (
          <p className="empty-note gifts-to-friends-status">Загрузка…</p>
        ) : items.length === 0 ? (
          <p className="empty-note gifts-to-friends-empty">
            Пока пусто. Забронируйте подарок в списке желаний друга — он появится здесь. Когда друг получит подарок или
            сам уберёт желание из «активных», строка останется с отметкой «Исполнено», чтобы вы ничего не забыли.
          </p>
        ) : (
          <ul className="gifts-to-friends-list">
            {items.map((row) => {
              const href = buildGiftToFriendHref(row);
              const thumb = resolveGiftImageUrl(row.imagePath);
              const price = formatGiftPrice(row.price);
              const ownerLine = row.ownerName
                ? `у ${String(row.ownerName).trim()}`
                : `ID: ${row.ownerIdUser}`;
              return (
                <li key={row.giftId}>
                  <a href={href} className="gifts-to-friends-row">
                    <span className="gifts-to-friends-thumb" aria-hidden>
                      <img src={thumb} alt="" loading="lazy" />
                    </span>
                    <span className="gifts-to-friends-body">
                      <span className="gifts-to-friends-title">{row.title || 'Подарок'}</span>
                      <span className="gifts-to-friends-meta">
                        {ownerLine}
                        {price ? ` · ${price}` : ''}
                      </span>
                    </span>
                    <span
                      className={`gifts-to-friends-badge${
                        row.rowState === 'fulfilled' ? ' gifts-to-friends-badge--fulfilled' : ''
                      }`}
                    >
                      {row.stateLabel}
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
        )}
        {message ? <p className="empty-note gifts-to-friends-error">{message}</p> : null}
      </div>
    </section>
  );
}
