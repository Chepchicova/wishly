import { useCallback, useEffect, useRef, useState } from 'react';
import { apiUrl } from '../api/config';

/**
 * Профиль: загрузка, форма, сохранение, меню настроек.
 * При выходе из сессии сбрасывает локальное состояние профиля.
 */
export function useProfileState({ currentUser, saveUser, clearAuthSession, showProfilePage }) {
  const [profileData, setProfileData] = useState(null);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [isProfileEditMode, setIsProfileEditMode] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [showIdCopiedHint, setShowIdCopiedHint] = useState(false);
  const profileDotsMenuRef = useRef(null);

  const [profileForm, setProfileForm] = useState({
    name: '',
    birthday: '',
    descriptionUser: '',
    photoDataUrl: '',
  });

  useEffect(() => {
    if (currentUser?.id_user) {
      return;
    }
    setProfileData(null);
    setProfileMessage('');
    setIsProfileEditMode(false);
    setIsProfileMenuOpen(false);
    setProfileForm({
      name: '',
      birthday: '',
      descriptionUser: '',
      photoDataUrl: '',
    });
  }, [currentUser?.id_user]);

  const loadProfile = useCallback(async () => {
    if (!currentUser || !currentUser.id_user) {
      return;
    }

    setIsProfileLoading(true);
    setProfileMessage('');

    try {
      const response = await fetch(apiUrl(`/api/profile/${currentUser.id_user}`));
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
  }, [currentUser, clearAuthSession]);

  useEffect(() => {
    if (showProfilePage) {
      loadProfile();
    }
  }, [showProfilePage, currentUser?.id_user, loadProfile]);

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
      const response = await fetch(apiUrl(`/api/profile/${currentUser.id_user}`), {
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

  return {
    profileData,
    isProfileLoading,
    isProfileEditMode,
    setIsProfileEditMode,
    profileMessage,
    setProfileMessage,
    isProfileMenuOpen,
    setIsProfileMenuOpen,
    showIdCopiedHint,
    profileDotsMenuRef,
    profileForm,
    setProfileForm,
    loadProfile,
    handleProfilePhotoChange,
    saveProfile,
    copyProfileIdUser,
  };
}
