import './SiteHeader.css';
import { navigationLinks } from '../constants/navigation';

export default function SiteHeader({ currentPathname, currentUser, onOpenLogin }) {
  return (
    <header className="site-header glass-bar">
      <a href="/" className="logo">
        <span className="logo-mark">WISH</span>LY
      </a>
      <nav className="header-nav" aria-label="Основная навигация">
        {navigationLinks.map(({ href, label }) => (
          <a
            key={href}
            href={href}
            className={`nav-link${
              currentPathname.startsWith(href) || (href === '/wishlists' && currentPathname === '/')
                ? ' nav-link--active'
                : ''
            }`}
          >
            {label}
          </a>
        ))}
      </nav>
      {currentUser ? (
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
      ) : (
        <button type="button" className="profile-block auth-open-button" onClick={onOpenLogin}>
          войти
        </button>
      )}
    </header>
  );
}
