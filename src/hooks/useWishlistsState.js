import { useCallback, useEffect, useRef, useState } from 'react';
import { apiUrl } from '../api/config';
import { getWishlistIconUrl } from '../constants/wishlistIcons';
import { formatEventDateForDisplay } from '../utils/dateFormat';

/**
 * Списки желаний: загрузка, поиск, выбор, удаление, меню карточки.
 */
export function useWishlistsState(currentUser, clearAuthSession, showWishlistsPage) {
  const [searchText, setSearchText] = useState('');
  const [wishlistsData, setWishlistsData] = useState([]);
  const [isWishlistsLoading, setIsWishlistsLoading] = useState(false);
  const [wishlistsMessage, setWishlistsMessage] = useState('');
  const [selectedWishlistId, setSelectedWishlistId] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const wishlistDotsMenuRef = useRef(null);

  const [deleteWishlistTarget, setDeleteWishlistTarget] = useState(null);
  const [isDeleteWishlistSubmitting, setIsDeleteWishlistSubmitting] = useState(false);
  const [deleteWishlistError, setDeleteWishlistError] = useState('');

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
    if (visibleWishlists.length === 0) {
      if (selectedWishlistId) {
        setSelectedWishlistId('');
      }
      return;
    }
    if (!selectedWishlistId && visibleWishlists.length > 0) {
      setSelectedWishlistId(visibleWishlists[0].id);
      return;
    }
    const selectedStillExists = visibleWishlists.some((wishlist) => wishlist.id === selectedWishlistId);
    if (!selectedStillExists && visibleWishlists.length > 0) {
      setSelectedWishlistId(visibleWishlists[0].id);
    }
  }, [visibleWishlists, selectedWishlistId]);

  const loadWishlists = useCallback(async () => {
    if (!currentUser || !currentUser.id_user) {
      setWishlistsData([]);
      setWishlistsMessage('Войдите, чтобы видеть свои списки желаний');
      return;
    }

    setIsWishlistsLoading(true);
    setWishlistsMessage('');

    try {
      const response = await fetch(apiUrl(`/api/wishlists/${currentUser.id_user}`));
      const data = await response.json();

      if (response.status === 404) {
        clearAuthSession();
        setWishlistsData([]);
        setWishlistsMessage('Пользователь не найден в базе. Войдите снова.');
        return;
      }

      if (!response.ok || !data.success) {
        setWishlistsData([]);
        setWishlistsMessage(data.error || 'Не удалось загрузить списки желаний');
        return;
      }

      const mappedWishlists = (data.wishlists || []).map((wishlist) => {
        const rawEvent = wishlist.eventDate != null ? String(wishlist.eventDate).trim() : '';
        const eventDateIso = /^\d{4}-\d{2}-\d{2}$/.test(rawEvent) ? rawEvent : '';
        return {
          ...wishlist,
          iconCode: wishlist.icon || 'basic',
          icon: getWishlistIconUrl(wishlist.icon),
          eventDate: formatEventDateForDisplay(wishlist.eventDate),
          eventDateIso,
          wishes: Array.isArray(wishlist.wishes) ? wishlist.wishes : [],
        };
      });

      setWishlistsData(mappedWishlists);
      setWishlistsMessage('');
    } catch (error) {
      console.error('WISHLISTS LOAD ERROR', error);
      setWishlistsData([]);
      setWishlistsMessage('Сервер недоступен');
    } finally {
      setIsWishlistsLoading(false);
    }
  }, [currentUser, clearAuthSession]);

  useEffect(() => {
    if (showWishlistsPage && currentUser?.id_user) {
      loadWishlists();
    }
  }, [showWishlistsPage, currentUser?.id_user, loadWishlists]);

  useEffect(() => {
    if (!showWishlistsPage || wishlistsData.length === 0) {
      return;
    }
    const raw = window.location.search.startsWith('?')
      ? window.location.search.slice(1)
      : window.location.search;
    const list = new URLSearchParams(raw).get('list');
    if (!list || !/^\d+$/.test(String(list).trim())) {
      return;
    }
    const id = String(Number(list));
    if (wishlistsData.some((w) => w.id === id)) {
      setSelectedWishlistId(id);
    }
  }, [showWishlistsPage, wishlistsData]);

  function requestDeleteWishlist(wishlist) {
    if (!wishlist) {
      return;
    }
    setIsMenuOpen(false);
    setDeleteWishlistError('');
    setDeleteWishlistTarget({ id: wishlist.id, title: wishlist.title });
  }

  function closeDeleteWishlistModal() {
    if (isDeleteWishlistSubmitting) {
      return;
    }
    setDeleteWishlistTarget(null);
    setDeleteWishlistError('');
  }

  async function confirmDeleteWishlist() {
    if (!deleteWishlistTarget || !currentUser?.id_user) {
      return;
    }

    setIsDeleteWishlistSubmitting(true);
    setDeleteWishlistError('');

    try {
      const response = await fetch(
        apiUrl(`/api/wishlists/${currentUser.id_user}/${deleteWishlistTarget.id}`),
        { method: 'DELETE' }
      );
      const data = await response.json();

      if (response.status === 404) {
        if (data.error === 'Пользователь не найден') {
          clearAuthSession();
          setDeleteWishlistError(data.error);
          return;
        }
        setDeleteWishlistTarget(null);
        await loadWishlists();
        return;
      }

      if (!response.ok || !data.success) {
        setDeleteWishlistError(data.error || 'Не удалось удалить список желаний');
        return;
      }

      setDeleteWishlistTarget(null);
      await loadWishlists();
    } catch (error) {
      console.error('DELETE WISHLIST ERROR', error);
      setDeleteWishlistError('Сервер недоступен');
    } finally {
      setIsDeleteWishlistSubmitting(false);
    }
  }

  return {
    searchText,
    setSearchText,
    wishlistsData,
    isWishlistsLoading,
    wishlistsMessage,
    selectedWishlistId,
    setSelectedWishlistId,
    isMenuOpen,
    setIsMenuOpen,
    wishlistDotsMenuRef,
    visibleWishlists,
    selectedWishlist,
    loadWishlists,
    deleteWishlistTarget,
    isDeleteWishlistSubmitting,
    deleteWishlistError,
    requestDeleteWishlist,
    closeDeleteWishlistModal,
    confirmDeleteWishlist,
  };
}
