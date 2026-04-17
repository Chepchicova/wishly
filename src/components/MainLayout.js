import { useEffect, useRef, useState } from 'react';
import './MainLayout.css';

import iconArt from '../assets/wishlist-icons/art.png';
import iconBalloon from '../assets/wishlist-icons/balloon.png';
import iconBasic from '../assets/wishlist-icons/basic.png';
import iconBirthday from '../assets/wishlist-icons/birthday.png';
import iconBook from '../assets/wishlist-icons/book.png';
import iconCarnival from '../assets/wishlist-icons/carnival.png';
import iconGame from '../assets/wishlist-icons/game.png';
import iconGift from '../assets/wishlist-icons/gift.png';
import iconHalloween from '../assets/wishlist-icons/halloween.png';
import iconHeart from '../assets/wishlist-icons/heart.png';
import iconHome from '../assets/wishlist-icons/home.png';
import iconMusic from '../assets/wishlist-icons/music.png';
import iconNewyear from '../assets/wishlist-icons/newyear.png';
import iconParty from '../assets/wishlist-icons/party.png';
import iconSport from '../assets/wishlist-icons/sport.png';
import iconStar from '../assets/wishlist-icons/star.png';
import iconStudy from '../assets/wishlist-icons/study.png';
import iconTravel from '../assets/wishlist-icons/travel.png';
import iconValentine from '../assets/wishlist-icons/valentine.png';
import iconWedding from '../assets/wishlist-icons/wedding.png';
import iconWork from '../assets/wishlist-icons/work.png';

const navigationLinks = [
  { href: '/wishlists', label: 'Мои вишлисты' },
  { href: '/friends', label: 'Друзья' },
  { href: '/gifts', label: 'Подарки друзьям' },
  { href: '/ai', label: 'AI-помощник' },
];

function formatBirthdayForDisplay(value) {
  if (!value) {
    return '';
  }
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return `${match[1]}.${match[2]}.${match[3]}`;
  }
  return String(value).slice(0, 10).replace(/-/g, '.');
}

function formatEventDateForDisplay(value) {
  if (!value) {
    return '';
  }
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) {
    return String(value);
  }
  return `${match[3]}.${match[2]}.${match[1]}`;
}

const wishlistIconUrlByCode = {
  basic: iconBasic,
  birthday: iconBirthday,
  newyear: iconNewyear,
  valentine: iconValentine,
  wedding: iconWedding,
  party: iconParty,
  gift: iconGift,
  balloon: iconBalloon,
  heart: iconHeart,
  star: iconStar,
  halloween: iconHalloween,
  carnival: iconCarnival,
  book: iconBook,
  art: iconArt,
  sport: iconSport,
  travel: iconTravel,
  music: iconMusic,
  home: iconHome,
  work: iconWork,
  game: iconGame,
  study: iconStudy,
};

function getWishlistIconUrl(iconCode) {
  const key = String(iconCode || 'basic').toLowerCase();
  return wishlistIconUrlByCode[key] || wishlistIconUrlByCode.basic;
}

const wishlistIconOptions = [
  { code: 'basic', label: 'Обычный' },
  { code: 'birthday', label: 'День рождения' },
  { code: 'newyear', label: 'Новый год' },
  { code: 'valentine', label: 'День влюблённых' },
  { code: 'wedding', label: 'Свадьба' },
  { code: 'party', label: 'Вечеринка' },
  { code: 'gift', label: 'Подарок' },
  { code: 'balloon', label: 'Шарик' },
  { code: 'heart', label: 'Сердце' },
  { code: 'star', label: 'Звезда' },
  { code: 'halloween', label: 'Хэллоуин' },
  { code: 'carnival', label: 'Карнавал' },
  { code: 'book', label: 'Книги' },
  { code: 'art', label: 'Искусство' },
  { code: 'sport', label: 'Спорт' },
  { code: 'travel', label: 'Путешествия' },
  { code: 'music', label: 'Музыка' },
  { code: 'home', label: 'Дом' },
  { code: 'work', label: 'Работа' },
  { code: 'game', label: 'Игры' },
  { code: 'study', label: 'Учёба' },
];

export default function MainLayout() {
  const savedUser = localStorage.getItem('auth_user');
  const initialUser = savedUser ? JSON.parse(savedUser) : null;

  const browserPathname = window.location.pathname;
  const currentPathname =
    browserPathname === '/profile/settings' ? '/profile' : browserPathname;
  const showWishlistsPage = currentPathname === '/' || currentPathname.startsWith('/wishlists');
  const showCreateWishlistPage = currentPathname === '/wishlists/new';
  const showWishlistsMainView = showWishlistsPage && !showCreateWishlistPage;
  const showProfilePage = currentPathname === '/profile';
  const [searchText, setSearchText] = useState('');
  const [wishlistsData, setWishlistsData] = useState([]);
  const [isWishlistsLoading, setIsWishlistsLoading] = useState(false);
  const [wishlistsMessage, setWishlistsMessage] = useState('');
  const [selectedWishlistId, setSelectedWishlistId] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(initialUser);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [authMessage, setAuthMessage] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [isProfileEditMode, setIsProfileEditMode] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [showIdCopiedHint, setShowIdCopiedHint] = useState(false);
  const wishlistDotsMenuRef = useRef(null);
  const profileDotsMenuRef = useRef(null);
  const wishlistIconPickerRef = useRef(null);
  const [profileForm, setProfileForm] = useState({
    name: '',
    birthday: '',
    descriptionUser: '',
    photoDataUrl: '',
  });

  const [loginForm, setLoginForm] = useState({
    name: '',
    email: '',
    password: '',
  });

  const [registerForm, setRegisterForm] = useState({
    name: '',
    email: '',
    birthday: '',
    password: '',
    passwordRepeat: '',
  });

  const [createWishlistForm, setCreateWishlistForm] = useState({
    title: '',
    description: '',
    eventDate: '',
    icon: 'basic',
  });
  const [createWishlistMessage, setCreateWishlistMessage] = useState('');
  const [isCreateWishlistSubmitting, setIsCreateWishlistSubmitting] = useState(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);

  const normalizedSearchText = searchText.trim().toLowerCase();
  const visibleWishlists = wishlistsData.filter((wishlist) => {
    if (normalizedSearchText === '') {
      return true;
    }
    return wishlist.title.toLowerCase().includes(normalizedSearchText);
  });

  const selectedWishlist =
    visibleWishlists.find((wishlist) => wishlist.id === selectedWishlistId) ||
    visibleWishlists[0] ||
    null;

  useEffect(() => {
    if (!selectedWishlistId && visibleWishlists.length > 0) {
      setSelectedWishlistId(visibleWishlists[0].id);
      return;
    }
    const selectedStillExists = visibleWishlists.some((wishlist) => wishlist.id === selectedWishlistId);
    if (!selectedStillExists && visibleWishlists.length > 0) {
      setSelectedWishlistId(visibleWishlists[0].id);
    }
  }, [visibleWishlists, selectedWishlistId]);

  function saveUser(user) {
    localStorage.setItem('auth_user', JSON.stringify(user));
    setCurrentUser(user);
  }

  function clearAuthSession() {
    localStorage.removeItem('auth_user');
    setCurrentUser(null);
    setProfileData(null);
    setProfileMessage('');
    setIsProfileEditMode(false);
    setIsProfileMenuOpen(false);
  }

  function closeAuthModal() {
    setIsAuthModalOpen(false);
    setAuthMessage('');
  }

  function openLoginModal() {
    setAuthMode('login');
    setIsAuthModalOpen(true);
    setAuthMessage('');
  }

  async function loadProfile() {
    if (!currentUser || !currentUser.id_user) {
      return;
    }

    setIsProfileLoading(true);
    setProfileMessage('');

    try {
      const response = await fetch(`http://localhost:5000/api/profile/${currentUser.id_user}`);
      const data = await response.json();

      if (response.status === 404) {
        clearAuthSession();
        setProfileMessage('Пользователь не найден в базе. Войдите снова.');
        return;
      }

      if (!response.ok || !data.success) {
        setProfileMessage(data.error || 'Не удалось загрузить профиль');
        return;
      }

      setProfileData(data.profile);
      setProfileForm({
        name: data.profile.name || '',
        birthday: data.profile.birthday ? String(data.profile.birthday).slice(0, 10) : '',
        descriptionUser: data.profile.description_user || '',
        photoDataUrl: '',
      });
    } catch (error) {
      console.error('PROFILE LOAD ERROR', error);
      setProfileMessage('Сервер недоступен');
    } finally {
      setIsProfileLoading(false);
    }
  }

  async function loadWishlists() {
    if (!currentUser || !currentUser.id_user) {
      setWishlistsData([]);
      setWishlistsMessage('Войдите, чтобы видеть свои вишлисты');
      return;
    }

    setIsWishlistsLoading(true);
    setWishlistsMessage('');

    try {
      const response = await fetch(`http://localhost:5000/api/wishlists/${currentUser.id_user}`);
      const data = await response.json();

      if (response.status === 404) {
        clearAuthSession();
        setWishlistsData([]);
        setWishlistsMessage('Пользователь не найден в базе. Войдите снова.');
        return;
      }

      if (!response.ok || !data.success) {
        setWishlistsData([]);
        setWishlistsMessage(data.error || 'Не удалось загрузить вишлисты');
        return;
      }

      const mappedWishlists = (data.wishlists || []).map((wishlist) => ({
        ...wishlist,
        icon: getWishlistIconUrl(wishlist.icon),
        eventDate: formatEventDateForDisplay(wishlist.eventDate),
        wishes: Array.isArray(wishlist.wishes) ? wishlist.wishes : [],
      }));

      setWishlistsData(mappedWishlists);
      setWishlistsMessage('');
    } catch (error) {
      console.error('WISHLISTS LOAD ERROR', error);
      setWishlistsData([]);
      setWishlistsMessage('Сервер недоступен');
    } finally {
      setIsWishlistsLoading(false);
    }
  }

  useEffect(() => {
    if (showWishlistsMainView) {
      loadWishlists();
    }
  }, [showWishlistsMainView, currentUser?.id_user]);

  async function submitCreateWishlist(event) {
    event.preventDefault();
    if (!currentUser || !currentUser.id_user) {
      setCreateWishlistMessage('Войдите, чтобы создать вишлист');
      return;
    }

    const title = createWishlistForm.title.trim();
    if (!title) {
      setCreateWishlistMessage('Укажите название');
      return;
    }

    setIsCreateWishlistSubmitting(true);
    setCreateWishlistMessage('');

    const payload = {
      title,
      description: createWishlistForm.description.trim() || undefined,
      dateEvent: createWishlistForm.eventDate || undefined,
      icon: createWishlistForm.icon,
      status: 'private',
    };

    try {
      const response = await fetch(`http://localhost:5000/api/wishlists/${currentUser.id_user}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (response.status === 404) {
        clearAuthSession();
        setCreateWishlistMessage('Пользователь не найден. Войдите снова.');
        return;
      }

      if (!response.ok || !data.success) {
        setCreateWishlistMessage(data.error || 'Не удалось создать вишлист');
        return;
      }

      window.location.href = '/wishlists';
    } catch (error) {
      console.error('CREATE WISHLIST ERROR', error);
      setCreateWishlistMessage('Сервер недоступен');
    } finally {
      setIsCreateWishlistSubmitting(false);
    }
  }

  function selectWishlistIcon(code) {
    setCreateWishlistForm((previous) => ({ ...previous, icon: code }));
    if (wishlistIconPickerRef.current) {
      wishlistIconPickerRef.current.open = false;
    }
  }

  useEffect(() => {
    if (showProfilePage) {
      loadProfile();
    }
  }, [showProfilePage, currentUser?.id_user]);

  useEffect(() => {
    if (window.location.pathname === '/profile/settings') {
      window.history.replaceState({}, '', '/profile');
    }
  }, []);

  useEffect(() => {
    if (!showProfilePage) {
      setIsProfileMenuOpen(false);
    }
  }, [showProfilePage]);

  useEffect(() => {
    if (!isMenuOpen && !isProfileMenuOpen) {
      return undefined;
    }

    function handleDocumentMouseDown(event) {
      if (isMenuOpen) {
        const root = wishlistDotsMenuRef.current;
        if (!root || !root.contains(event.target)) {
          setIsMenuOpen(false);
        }
      }
      if (isProfileMenuOpen) {
        const root = profileDotsMenuRef.current;
        if (!root || !root.contains(event.target)) {
          setIsProfileMenuOpen(false);
        }
      }
    }

    document.addEventListener('mousedown', handleDocumentMouseDown);
    return () => document.removeEventListener('mousedown', handleDocumentMouseDown);
  }, [isMenuOpen, isProfileMenuOpen]);

  useEffect(() => {
    const savedJson = localStorage.getItem('auth_user');
    if (!savedJson) {
      return;
    }

    let savedUser;
    try {
      savedUser = JSON.parse(savedJson);
    } catch {
      localStorage.removeItem('auth_user');
      setCurrentUser(null);
      return;
    }

    if (!savedUser || !savedUser.id_user) {
      return;
    }

    let cancelled = false;

    async function validateSavedUserStillExists() {
      try {
        const response = await fetch(`http://localhost:5000/api/profile/${savedUser.id_user}`);
        if (cancelled) {
          return;
        }
        if (response.status === 404) {
          clearAuthSession();
        }
      } catch {
        /* сервер недоступен — сессию не трогаем */
      }
    }

    validateSavedUserStillExists();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleProfilePhotoChange(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) {
      return;
    }

    const fileReader = new FileReader();
    fileReader.onload = () => {
      setProfileForm((previousForm) => ({
        ...previousForm,
        photoDataUrl: String(fileReader.result || ''),
      }));
    };
    fileReader.readAsDataURL(file);
  }

  async function saveProfile(event) {
    event.preventDefault();

    if (!currentUser || !currentUser.id_user) {
      setProfileMessage('Вы не авторизованы');
      return;
    }

    setIsProfileLoading(true);
    setProfileMessage('');

    try {
      const response = await fetch(`http://localhost:5000/api/profile/${currentUser.id_user}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileForm),
      });
      const data = await response.json();

      if (response.status === 404) {
        clearAuthSession();
        setProfileMessage('Пользователь не найден в базе. Войдите снова.');
        return;
      }

      if (!response.ok || !data.success) {
        setProfileMessage(data.error || 'Не удалось сохранить профиль');
        return;
      }

      setProfileData(data.profile);
      saveUser({
        ...currentUser,
        name: data.profile.name,
        birthday: data.profile.birthday,
      });
      setIsProfileEditMode(false);
      setIsProfileMenuOpen(false);
    } catch (error) {
      console.error('PROFILE SAVE ERROR', error);
      setProfileMessage('Сервер недоступен');
    } finally {
      setIsProfileLoading(false);
    }
  }

  function logoutUser() {
    clearAuthSession();
    window.location.href = '/';
  }

  async function copyProfileIdUser(idUser) {
    const text = String(idUser);
    try {
      await navigator.clipboard.writeText(text);
      setProfileMessage('');
      setShowIdCopiedHint(true);
      window.setTimeout(() => setShowIdCopiedHint(false), 2200);
    } catch {
      setProfileMessage('Не удалось скопировать ID');
    }
  }

  function isEmailFormatValid(email) {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailPattern.test(email);
  }

  async function sendLogin(event) {
    event.preventDefault();
    setIsAuthLoading(true);
    setAuthMessage('');

    try {
      if (!isEmailFormatValid(loginForm.email)) {
        setAuthMessage('Введите корректный email');
        return;
      }

      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        setAuthMessage(data.error || 'Ошибка входа');
        return;
      }

      saveUser(data.user);
      closeAuthModal();
      console.log('LOGIN SUCCESS', data.user);
    } catch (error) {
      console.error('LOGIN REQUEST ERROR', error);
      setAuthMessage('Сервер недоступен');
    } finally {
      setIsAuthLoading(false);
    }
  }

  async function sendRegister(event) {
    event.preventDefault();
    setIsAuthLoading(true);
    setAuthMessage('');

    try {
      if (!isEmailFormatValid(registerForm.email)) {
        setAuthMessage('Введите корректный email');
        return;
      }

      if (registerForm.password.length < 6) {
        setAuthMessage('Пароль должен содержать минимум 6 символов');
        return;
      }

      if (registerForm.password !== registerForm.passwordRepeat) {
        setAuthMessage('Пароль и повтор пароля должны совпадать');
        return;
      }

      const response = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registerForm),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        setAuthMessage(data.error || 'Ошибка регистрации');
        return;
      }

      saveUser(data.user);
      closeAuthModal();
      console.log('REGISTER SUCCESS', data.user);
    } catch (error) {
      console.error('REGISTER REQUEST ERROR', error);
      setAuthMessage('Сервер недоступен');
    } finally {
      setIsAuthLoading(false);
    }
  }

  return (
    <div className="app-shell">
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
          <button type="button" className="profile-block auth-open-button" onClick={openLoginModal}>
            войти
          </button>
        )}
      </header>

      <main className="site-main">
        {showWishlistsMainView && (
          <section className="wishlists-page">
            <div className="wishlists-head">
              <div>
                <h1 className="wishlists-title">Мои вишлисты</h1>
                <p className="wishlists-subtitle">
                  Создавайте и организуйте свои списки желаний
                </p>
              </div>
              {currentUser ? (
                <a href="/wishlists/new" className="action-btn primary-btn wishlists-new-link">
                  + Новый вишлист
                </a>
              ) : (
                <button type="button" className="action-btn primary-btn" onClick={openLoginModal}>
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
                    onChange={(event) => setSearchText(event.target.value)}
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
                          setSelectedWishlistId(wishlist.id);
                          setIsMenuOpen(false);
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
                            onClick={() => setIsMenuOpen((previousState) => !previousState)}
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
        )}

        {showCreateWishlistPage && (
          <section className="profile-page create-wishlist-page">
            <div className="profile-card create-wishlist-inner">
              <div className="create-wishlist-head">
                <a href="/wishlists" className="create-wishlist-back">
                  ← К спискам
                </a>
                <h1 className="wishlists-title">Новый вишлист</h1>
                <p className="wishlists-subtitle">Заполните поля и сохраните список</p>
              </div>

              {!currentUser ? (
                <div className="profile-card create-wishlist-guest">
                  <p>Чтобы создать вишлист, войдите в аккаунт.</p>
                  <button type="button" className="action-btn primary-btn" onClick={openLoginModal}>
                    Войти
                  </button>
                </div>
              ) : (
                <form className="wishlist-create-form profile-edit-form" onSubmit={submitCreateWishlist}>
                  <label>
                    <span className="form-label-row">
                      Название <span className="field-required">*</span>
                    </span>
                    <input
                      required
                      maxLength={200}
                      value={createWishlistForm.title}
                      onChange={(event) =>
                        setCreateWishlistForm({ ...createWishlistForm, title: event.target.value })
                      }
                      placeholder="Например: День рождения 2026"
                    />
                  </label>

                  <label>
                    Описание
                    <textarea
                      rows={5}
                      value={createWishlistForm.description}
                      onChange={(event) =>
                        setCreateWishlistForm({ ...createWishlistForm, description: event.target.value })
                      }
                      placeholder="Опишите, почему этот список важен для вас. Мечты любят подробности"
                    />
                  </label>

                  <label>
                    Дата события
                    <input
                      type="date"
                      value={createWishlistForm.eventDate}
                      onChange={(event) =>
                        setCreateWishlistForm({ ...createWishlistForm, eventDate: event.target.value })
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
                          {wishlistIconOptions.find((o) => o.code === createWishlistForm.icon)?.label ||
                            'Обычный'}
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
                            onClick={() => selectWishlistIcon(code)}
                            title={label}
                          >
                            <img src={getWishlistIconUrl(code)} alt="" width={40} height={40} />
                            <span>{label}</span>
                          </button>
                        ))}
                      </div>
                    </details>
                  </div>

                  <button
                    type="button"
                    className="privacy-settings-strip"
                    onClick={() => setIsPrivacyModalOpen(true)}
                  >
                    <span className="privacy-settings-strip-title">Настройки приватности</span>
                    <span className="privacy-settings-strip-hint">
                      Укажите, кто может просматривать ваш список
                    </span>
                  </button>

                  <div className="profile-form-actions">
                    <button
                      type="submit"
                      className="action-btn primary-btn"
                      disabled={isCreateWishlistSubmitting}
                    >
                      {isCreateWishlistSubmitting ? 'Сохранение…' : 'Создать вишлист'}
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
        )}

        {showProfilePage && (
          <section className="profile-page">
            {!currentUser ? (
              <div className="profile-card">
                <h1>Профиль</h1>
                <p>Чтобы открыть профиль, сначала выполните вход.</p>
                <button type="button" className="action-btn primary-btn" onClick={openLoginModal}>
                  Войти
                </button>
              </div>
            ) : (
              <div className="profile-card">
                <>
                  <div className="profile-card-header">
                    <h1 className="profile-page-title">Профиль</h1>
                    <div className="dots-menu-wrap" ref={profileDotsMenuRef}>
                      <button
                        type="button"
                        className="dots-btn"
                        aria-label="Меню профиля"
                        aria-expanded={isProfileMenuOpen}
                        onClick={() => setIsProfileMenuOpen((previous) => !previous)}
                      >
                        ...
                      </button>
                      {isProfileMenuOpen && (
                        <div className="dots-menu" role="menu">
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              setIsProfileEditMode(true);
                              setIsProfileMenuOpen(false);
                            }}
                          >
                            Редактировать
                          </button>
                          <button type="button" role="menuitem" disabled>
                            Настройки
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {isProfileLoading && <p className="profile-message">Загрузка...</p>}
                  {!isProfileLoading && profileData && (
                    <>
                      <div className="profile-top-row">
                        <div className="profile-avatar-wrap">
                          {profileForm.photoDataUrl || profileData.photo_url ? (
                            <img
                              src={profileForm.photoDataUrl || `http://localhost:5000${profileData.photo_url}`}
                              alt="Фото профиля"
                              className="profile-avatar"
                            />
                          ) : (
                            <svg viewBox="0 0 24 24" className="profile-avatar-svg" aria-hidden>
                              <circle cx="12" cy="8" r="3.5" fill="currentColor" />
                              <path d="M5 19.5c0-3.5 3.5-5.5 7-5.5s7 2 7 5.5" fill="currentColor" />
                            </svg>
                          )}
                        </div>

                        <div className="profile-main-info">
                          <h1>{profileData.name}</h1>
                          <div className="profile-id-row">
                            <span className="profile-id-label">ID</span>
                            <button
                              type="button"
                              className="profile-id-value profile-id-clickable"
                              title="Нажмите, чтобы скопировать"
                              onClick={() => copyProfileIdUser(profileData.id_user)}
                            >
                              {profileData.id_user}
                            </button>
                            {showIdCopiedHint && (
                              <span className="profile-id-copied-hint" role="status">
                                ID скопирован
                              </span>
                            )}
                          </div>
                          {profileData.birthday && (
                            <p className="profile-birthday-line">
                              Дата рождения: {formatBirthdayForDisplay(profileData.birthday)}
                            </p>
                          )}
                          {profileData.description_user && (
                            <p>Описание: {profileData.description_user}</p>
                          )}
                        </div>
                      </div>

                      {isProfileEditMode ? (
                        <form className="profile-edit-form" onSubmit={saveProfile}>
                          <label>
                            Имя
                            <input
                              required
                              value={profileForm.name}
                              onChange={(event) =>
                                setProfileForm({ ...profileForm, name: event.target.value })
                              }
                            />
                          </label>
                          <label>
                            Дата рождения
                            <input
                              type="date"
                              value={profileForm.birthday}
                              onChange={(event) =>
                                setProfileForm({ ...profileForm, birthday: event.target.value })
                              }
                            />
                          </label>
                          <label>
                            Описание
                            <textarea
                              rows={4}
                              value={profileForm.descriptionUser}
                              onChange={(event) =>
                                setProfileForm({ ...profileForm, descriptionUser: event.target.value })
                              }
                            />
                          </label>
                          <label>
                            Фото профиля
                            <input
                              type="file"
                              accept="image/png,image/jpeg,image/webp"
                              onChange={handleProfilePhotoChange}
                            />
                          </label>
                          <div className="profile-form-actions">
                            <button type="submit" className="action-btn primary-btn">
                              Сохранить
                            </button>
                            <button
                              type="button"
                              className="action-btn"
                              onClick={() => setIsProfileEditMode(false)}
                            >
                              Отмена
                            </button>
                          </div>
                        </form>
                      ) : (
                        <div className="profile-logout-row">
                          <button type="button" className="action-btn" onClick={logoutUser}>
                            Выйти
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </>
                {profileMessage && <p className="profile-message">{profileMessage}</p>}
              </div>
            )}
          </section>
        )}
      </main>

      <footer className="site-footer glass-bar">
        <div className="footer-inner">WISHLY</div>
      </footer>

      {isAuthModalOpen && (
        <div className="auth-modal-backdrop" onClick={closeAuthModal}>
          <section className="auth-modal" onClick={(event) => event.stopPropagation()}>
            <div className="auth-header-row">
              <h2 className="auth-title">{authMode === 'login' ? 'Вход' : 'Регистрация'}</h2>
              <button type="button" className="auth-close-button" onClick={closeAuthModal}>
                x
              </button>
            </div>
            {authMode === 'login' ? (
              <p className="auth-switch-text">
                Нет аккаунта?{' '}
                <button type="button" className="auth-switch-link" onClick={() => setAuthMode('register')}>
                  Зарегистрироваться
                </button>
              </p>
            ) : (
              <p className="auth-switch-text">
                Уже есть аккаунт?{' '}
                <button type="button" className="auth-switch-link" onClick={() => setAuthMode('login')}>
                  Войти
                </button>
              </p>
            )}

            {authMode === 'login' ? (
              <form className="auth-form" onSubmit={sendLogin}>
                <label>
                  Имя
                  <input
                    required
                    value={loginForm.name}
                    onChange={(event) =>
                      setLoginForm({ ...loginForm, name: event.target.value })
                    }
                  />
                </label>
                <label>
                  Email
                  <input
                    type="email"
                    required
                    value={loginForm.email}
                    onChange={(event) =>
                      setLoginForm({ ...loginForm, email: event.target.value })
                    }
                  />
                </label>
                <label>
                  Пароль
                  <input
                    type="password"
                    required
                    value={loginForm.password}
                    onChange={(event) =>
                      setLoginForm({ ...loginForm, password: event.target.value })
                    }
                  />
                </label>
                <button type="submit" className="action-btn primary-btn" disabled={isAuthLoading}>
                  {isAuthLoading ? 'Загрузка...' : 'Войти'}
                </button>
              </form>
            ) : (
              <form className="auth-form" onSubmit={sendRegister}>
                <label>
                  Имя
                  <input
                    required
                    value={registerForm.name}
                    onChange={(event) =>
                      setRegisterForm({ ...registerForm, name: event.target.value })
                    }
                  />
                </label>
                <label>
                  Email
                  <input
                    type="email"
                    required
                    value={registerForm.email}
                    onChange={(event) =>
                      setRegisterForm({ ...registerForm, email: event.target.value })
                    }
                  />
                </label>
                <label>
                  День рождения
                  <input
                    type="date"
                    value={registerForm.birthday}
                    onChange={(event) =>
                      setRegisterForm({ ...registerForm, birthday: event.target.value })
                    }
                  />
                </label>
                <label>
                  Пароль
                  <input
                    type="password"
                    required
                    value={registerForm.password}
                    onChange={(event) =>
                      setRegisterForm({ ...registerForm, password: event.target.value })
                    }
                  />
                </label>
                <label>
                  Повтор пароля
                  <input
                    type="password"
                    required
                    value={registerForm.passwordRepeat}
                    onChange={(event) =>
                      setRegisterForm({ ...registerForm, passwordRepeat: event.target.value })
                    }
                  />
                </label>
                <button type="submit" className="action-btn primary-btn" disabled={isAuthLoading}>
                  {isAuthLoading ? 'Загрузка...' : 'Зарегистрироваться'}
                </button>
              </form>
            )}

            {authMessage && <p className="auth-message">{authMessage}</p>}
          </section>
        </div>
      )}

      {isPrivacyModalOpen && (
        <div className="auth-modal-backdrop" onClick={() => setIsPrivacyModalOpen(false)}>
          <section className="auth-modal privacy-modal" onClick={(event) => event.stopPropagation()}>
            <div className="auth-header-row">
              <h2 className="auth-title">Настройки приватности</h2>
              <button
                type="button"
                className="auth-close-button"
                onClick={() => setIsPrivacyModalOpen(false)}
              >
                x
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
