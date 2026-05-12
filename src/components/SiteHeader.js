import './SiteHeader.css';
import { navigationLinks } from '../constants/navigation';

export default function SiteHeader({
  currentPathname,
  currentUser,
  onOpenLogin,
  /** Просмотр подарка друга по URL /wishlists/gifts/… — подсвечиваем «Друзья», а не «Мои списки». */
  treatAsFriendsSection = false,
}) {
  const wishlistsNavActive =
    !treatAsFriendsSection &&
    (currentPathname.startsWith('/wishlists') || currentPathname === '/');
  const friendsNavActive = treatAsFriendsSection || currentPathname.startsWith('/friends');
  const giftsNavActive = currentPathname === '/gifts' || currentPathname.startsWith('/gifts/');

  return (
    <header className="site-header glass-bar">
      <a href="/" className="logo">
        <span className="logo-mark">WISH</span>LY
      </a>
      <nav className="header-nav" aria-label="Основная навигация">
        {navigationLinks.map(({ href, label }) => {
          const active =
            href === '/wishlists'
              ? wishlistsNavActive
              : href === '/friends'
                ? friendsNavActive
                : href === '/gifts'
                  ? giftsNavActive
                  : currentPathname.startsWith(href);
          return (
            <a key={href} href={href} className={`nav-link${active ? ' nav-link--active' : ''}`}>
              {label}
            </a>
          );
        })}
      </nav>
      {currentUser ? (
        <div className="site-header-actions">
          <button
            type="button"
            className="header-notifications-btn"
            aria-label="Системные уведомления"
            title="Уведомления"
          >
            <span className="material-symbols-outlined header-notifications-btn__icon" aria-hidden>
              notifications
            </span>
          </button>
          <a
            href="/profile"
            className={`profile-block${currentPathname.startsWith('/profile') ? ' nav-link--active' : ''}`}
          >
            <span className="profile-icon" aria-hidden>
              <svg viewBox="0 0 24 24" width={22} height={22} fill="none">
                <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.75" />
                <path
                  d="M5 19.5c0-3.5 3.5-5.5 7-5.5s7 2 7 5.5"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <span className="profile-label">профиль</span>
          </a>
        </div>
      ) : (
        <button type="button" className="profile-block auth-open-button" onClick={onOpenLogin}>
          войти
        </button>
      )}
    </header>
  );
}
