import { useCallback, useEffect, useState } from 'react';
import './SiteHeader.css';
import { navigationLinks } from '../constants/navigation';

export default function SiteHeader({
  currentPathname,
  currentUser,
  onOpenLogin,
  /** Просмотр подарка друга по URL /wishlists/gifts/… — подсвечиваем «Друзья», а не «Мои списки». */
  treatAsFriendsSection = false,
}) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const closeMobileNav = useCallback(() => setMobileNavOpen(false), []);
  const toggleMobileNav = useCallback(() => setMobileNavOpen((open) => !open), []);

  useEffect(() => {
    if (!mobileNavOpen) {
      return undefined;
    }
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setMobileNavOpen(false);
      }
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [mobileNavOpen]);

  useEffect(() => {
    const media = window.matchMedia('(min-width: 769px)');
    const onChange = () => {
      if (media.matches) {
        setMobileNavOpen(false);
      }
    };
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  const wishlistsNavActive =
    !treatAsFriendsSection &&
    (currentPathname.startsWith('/wishlists') || currentPathname === '/');
  const friendsNavActive = treatAsFriendsSection || currentPathname.startsWith('/friends');
  const giftsNavActive = currentPathname === '/gifts' || currentPathname.startsWith('/gifts/');

  const headerClass = `site-header glass-bar${mobileNavOpen ? ' site-header--nav-open' : ''}`;

  return (
    <header className={headerClass}>
      <button
        type="button"
        className="header-burger"
        aria-label={mobileNavOpen ? 'Закрыть меню' : 'Открыть меню'}
        aria-expanded={mobileNavOpen}
        onClick={toggleMobileNav}
      >
        <span className="header-burger__bars" aria-hidden>
          <span className="header-burger__bar" />
          <span className="header-burger__bar" />
          <span className="header-burger__bar" />
        </span>
      </button>
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
            <a
              key={href}
              href={href}
              className={`nav-link${active ? ' nav-link--active' : ''}`}
              onClick={closeMobileNav}
            >
              {label}
            </a>
          );
        })}
      </nav>
      <div className="site-header-trailing">
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
              onClick={closeMobileNav}
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
          <button
            type="button"
            className="profile-block auth-open-button"
            onClick={() => {
              closeMobileNav();
              onOpenLogin();
            }}
          >
            войти
          </button>
        )}
      </div>
      {mobileNavOpen ? (
        <button
          type="button"
          className="header-nav-backdrop"
          aria-label="Закрыть меню"
          onClick={closeMobileNav}
        />
      ) : null}
    </header>
  );
}
