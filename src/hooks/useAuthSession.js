import { useCallback, useEffect, useState } from 'react';
import { apiUrl } from '../api/config';

function readInitialUser() {
  const savedUser = localStorage.getItem('auth_user');
  return savedUser ? JSON.parse(savedUser) : null;
}

function isEmailFormatValid(email) {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailPattern.test(email);
}

/**
 * Сессия и формы входа/регистрации (домен «auth»).
 */
export function useAuthSession() {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      return readInitialUser();
    } catch {
      return null;
    }
  });

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [authMessage, setAuthMessage] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);

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

  const saveUser = useCallback((user) => {
    localStorage.setItem('auth_user', JSON.stringify(user));
    setCurrentUser(user);
  }, []);

  const clearAuthSession = useCallback(() => {
    localStorage.removeItem('auth_user');
    setCurrentUser(null);
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsAuthModalOpen(false);
    setAuthMessage('');
  }, []);

  const openLoginModal = useCallback(() => {
    setAuthMode('login');
    setIsAuthModalOpen(true);
    setAuthMessage('');
  }, []);

  const logoutUser = useCallback(() => {
    clearAuthSession();
    window.location.href = '/';
  }, [clearAuthSession]);

  const sendLogin = useCallback(
    async (event) => {
      event.preventDefault();
      setIsAuthLoading(true);
      setAuthMessage('');

      try {
        if (!isEmailFormatValid(loginForm.email)) {
          setAuthMessage('Введите корректный email');
          return;
        }

        const response = await fetch(apiUrl('/api/auth/login'), {
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
    },
    [loginForm, saveUser, closeAuthModal]
  );

  const sendRegister = useCallback(
    async (event) => {
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

        const response = await fetch(apiUrl('/api/auth/register'), {
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
    },
    [registerForm, saveUser, closeAuthModal]
  );

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
        const response = await fetch(apiUrl(`/api/profile/${parsedSavedUser.id_user}`));
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
  }, [clearAuthSession]);

  return {
    currentUser,
    saveUser,
    clearAuthSession,
    logoutUser,
    isAuthModalOpen,
    setIsAuthModalOpen,
    authMode,
    setAuthMode,
    authMessage,
    setAuthMessage,
    isAuthLoading,
    loginForm,
    setLoginForm,
    registerForm,
    setRegisterForm,
    closeAuthModal,
    openLoginModal,
    sendLogin,
    sendRegister,
  };
}
