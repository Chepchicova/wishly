import { useEffect, useRef, useState } from 'react';
import './AppShell.css';
import './SharedUi.css';

import AuthModal from './AuthModal';
import PrivacyModal from './PrivacyModal';
import SiteFooter from './SiteFooter';
import SiteHeader from './SiteHeader';
import CreateWishlistPage from '../pages/CreateWishlistPage';
import ProfilePage from '../pages/ProfilePage';
import WishlistsPage from '../pages/WishlistsPage';
import { getWishlistIconUrl } from '../constants/wishlistIcons';
import { formatEventDateForDisplay } from '../utils/dateFormat';

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

    let parsedSavedUser;
    try {
      parsedSavedUser = JSON.parse(savedJson);
    } catch {
      localStorage.removeItem('auth_user');
      setCurrentUser(null);
      return;
    }

    if (!parsedSavedUser || !parsedSavedUser.id_user) {
      return;
    }

    let cancelled = false;

    async function validateSavedUserStillExists() {
      try {
        const response = await fetch(`http://localhost:5000/api/profile/${parsedSavedUser.id_user}`);
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
      <SiteHeader
        currentPathname={currentPathname}
        currentUser={currentUser}
        onOpenLogin={openLoginModal}
      />

      <main className="site-main">
        {showWishlistsMainView && (
          <WishlistsPage
            searchText={searchText}
            onSearchTextChange={setSearchText}
            isWishlistsLoading={isWishlistsLoading}
            visibleWishlists={visibleWishlists}
            selectedWishlist={selectedWishlist}
            onSelectWishlist={(id) => {
              setSelectedWishlistId(id);
              setIsMenuOpen(false);
            }}
            wishlistsMessage={wishlistsMessage}
            currentUser={currentUser}
            onOpenLogin={openLoginModal}
            isMenuOpen={isMenuOpen}
            onToggleWishlistMenu={() => setIsMenuOpen((previousState) => !previousState)}
            wishlistDotsMenuRef={wishlistDotsMenuRef}
          />
        )}

        {showCreateWishlistPage && (
          <CreateWishlistPage
            currentUser={currentUser}
            onOpenLogin={openLoginModal}
            createWishlistForm={createWishlistForm}
            onCreateWishlistFormChange={setCreateWishlistForm}
            onSubmitCreateWishlist={submitCreateWishlist}
            createWishlistMessage={createWishlistMessage}
            isCreateWishlistSubmitting={isCreateWishlistSubmitting}
            wishlistIconPickerRef={wishlistIconPickerRef}
            onSelectWishlistIcon={selectWishlistIcon}
            onOpenPrivacyModal={() => setIsPrivacyModalOpen(true)}
          />
        )}

        {showProfilePage && (
          <ProfilePage
            currentUser={currentUser}
            onOpenLogin={openLoginModal}
            profileData={profileData}
            isProfileLoading={isProfileLoading}
            profileMessage={profileMessage}
            profileForm={profileForm}
            onProfileFormChange={setProfileForm}
            isProfileEditMode={isProfileEditMode}
            onSetProfileEditMode={setIsProfileEditMode}
            onBeginProfileEdit={() => {
              setIsProfileEditMode(true);
              setIsProfileMenuOpen(false);
            }}
            isProfileMenuOpen={isProfileMenuOpen}
            onToggleProfileMenu={() => setIsProfileMenuOpen((previous) => !previous)}
            profileDotsMenuRef={profileDotsMenuRef}
            showIdCopiedHint={showIdCopiedHint}
            onSaveProfile={saveProfile}
            onProfilePhotoChange={handleProfilePhotoChange}
            onCopyProfileId={copyProfileIdUser}
            onLogout={logoutUser}
          />
        )}
      </main>

      <SiteFooter />

      {isAuthModalOpen && (
        <AuthModal
          authMode={authMode}
          onClose={closeAuthModal}
          onSetAuthMode={setAuthMode}
          loginForm={loginForm}
          onLoginFormChange={setLoginForm}
          registerForm={registerForm}
          onRegisterFormChange={setRegisterForm}
          onSubmitLogin={sendLogin}
          onSubmitRegister={sendRegister}
          authMessage={authMessage}
          isAuthLoading={isAuthLoading}
        />
      )}

      {isPrivacyModalOpen && <PrivacyModal onClose={() => setIsPrivacyModalOpen(false)} />}
    </div>
  );
}
