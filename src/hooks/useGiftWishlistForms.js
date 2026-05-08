import { useEffect, useRef, useState } from 'react';
import { apiUrl } from '../api/config';

/**
 * Формы создания/редактирования списка и подарка, загрузка карточки подарка.
 */
export function useGiftWishlistForms({
  currentUser,
  clearAuthSession,
  wishlistsData,
  editingWishlistId,
  viewingGiftId,
  browserPathname,
}) {
  const wishlistIconPickerRef = useRef(null);

  const [createWishlistForm, setCreateWishlistForm] = useState({
    title: '',
    description: '',
    eventDate: '',
    icon: 'basic',
  });
  const [createWishlistMessage, setCreateWishlistMessage] = useState('');
  const [isCreateWishlistSubmitting, setIsCreateWishlistSubmitting] = useState(false);

  const [createGiftForm, setCreateGiftForm] = useState({
    title: '',
    description: '',
    price: '',
    url: '',
    imageDataUrl: '',
    imagePath: '',
    selectedWishlistIds: [],
  });
  const [createGiftMessage, setCreateGiftMessage] = useState('');
  const [isCreateGiftSubmitting, setIsCreateGiftSubmitting] = useState(false);
  const [giftDetailsWishlists, setGiftDetailsWishlists] = useState([]);
  const [isGiftDetailsLoading, setIsGiftDetailsLoading] = useState(false);

  useEffect(() => {
    if (browserPathname === '/wishlists/new') {
      setCreateWishlistForm({ title: '', description: '', eventDate: '', icon: 'basic' });
      setCreateWishlistMessage('');
    }
  }, [browserPathname]);

  useEffect(() => {
    if (browserPathname !== '/wishlists/gifts/new') {
      return;
    }
    const params = new URLSearchParams(window.location.search);
    const listId = params.get('list');
    const initialLists =
      listId && /^\d+$/.test(String(listId).trim()) ? [String(Number(listId))] : [];
    setCreateGiftForm({
      title: '',
      description: '',
      price: '',
      url: '',
      imageDataUrl: '',
      imagePath: '',
      selectedWishlistIds: initialLists,
    });
    setCreateGiftMessage('');
  }, [browserPathname]);

  useEffect(() => {
    if (!viewingGiftId || !currentUser?.id_user) {
      return;
    }

    let cancelled = false;
    async function loadGiftDetails() {
      setIsGiftDetailsLoading(true);
      setCreateGiftMessage('');
      try {
        const response = await fetch(apiUrl(`/api/gifts/${currentUser.id_user}/${viewingGiftId}`));
        const data = await response.json();
        if (cancelled) {
          return;
        }
        if (response.status === 404) {
          if (data.error === 'Пользователь не найден') {
            clearAuthSession();
          }
          setCreateGiftMessage(data.error || 'Подарок не найден');
          return;
        }
        if (!response.ok || !data.success) {
          setCreateGiftMessage(data.error || 'Не удалось загрузить подарок');
          return;
        }

        setCreateGiftForm({
          title: data.gift.title || '',
          description: data.gift.description || '',
          price: data.gift.price || '',
          url: data.gift.url || '',
          imageDataUrl: '',
          imagePath: data.gift.imagePath || '',
          selectedWishlistIds: Array.isArray(data.gift.wishlistIds) ? data.gift.wishlistIds.map(String) : [],
        });
        setGiftDetailsWishlists(Array.isArray(data.gift.wishlists) ? data.gift.wishlists : []);
      } catch (error) {
        if (!cancelled) {
          setCreateGiftMessage('Сервер недоступен');
        }
      } finally {
        if (!cancelled) {
          setIsGiftDetailsLoading(false);
        }
      }
    }

    loadGiftDetails();
    return () => {
      cancelled = true;
    };
  }, [viewingGiftId, currentUser?.id_user, clearAuthSession]);

  useEffect(() => {
    if (!editingWishlistId) {
      return;
    }
    const wishlist = wishlistsData.find((item) => item.id === editingWishlistId);
    if (!wishlist) {
      return;
    }
    setCreateWishlistForm({
      title: wishlist.title,
      description: wishlist.description || '',
      eventDate: wishlist.eventDateIso || '',
      icon: wishlist.iconCode || 'basic',
    });
    setCreateWishlistMessage('');
  }, [editingWishlistId, wishlistsData]);

  async function submitCreateWishlist(event) {
    event.preventDefault();
    if (!currentUser || !currentUser.id_user) {
      setCreateWishlistMessage('Войдите, чтобы создать список желаний');
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
      const isEdit = Boolean(editingWishlistId);
      const url = isEdit
        ? apiUrl(`/api/wishlists/${currentUser.id_user}/${editingWishlistId}`)
        : apiUrl(`/api/wishlists/${currentUser.id_user}`);
      const response = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
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
        setCreateWishlistMessage(
          data.error || (isEdit ? 'Не удалось сохранить список желаний' : 'Не удалось создать список желаний')
        );
        return;
      }

      window.location.href = '/wishlists';
    } catch (error) {
      console.error('SAVE WISHLIST ERROR', error);
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

  function toggleGiftWishlist(wishlistId) {
    const id = String(wishlistId);
    setCreateGiftForm((previous) => {
      const next = new Set(previous.selectedWishlistIds.map(String));
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return { ...previous, selectedWishlistIds: Array.from(next) };
    });
  }

  function handleGiftImageChange(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) {
      return;
    }
    const fileReader = new FileReader();
    fileReader.onload = () => {
      setCreateGiftForm((previous) => ({
        ...previous,
        imageDataUrl: String(fileReader.result || ''),
      }));
    };
    fileReader.readAsDataURL(file);
  }

  async function submitCreateGift(event) {
    event.preventDefault();
    if (!currentUser || !currentUser.id_user) {
      setCreateGiftMessage('Войдите, чтобы добавить подарок');
      return;
    }

    const title = createGiftForm.title.trim();
    if (!title) {
      setCreateGiftMessage('Укажите название подарка');
      return;
    }

    if (!createGiftForm.selectedWishlistIds.length) {
      setCreateGiftMessage('Выберите хотя бы один список желаний');
      return;
    }

    setIsCreateGiftSubmitting(true);
    setCreateGiftMessage('');

    const payload = {
      title,
      description: createGiftForm.description.trim() || undefined,
      price: createGiftForm.price.trim() || undefined,
      url: createGiftForm.url.trim() || undefined,
      wishlistIds: createGiftForm.selectedWishlistIds,
    };
    if (createGiftForm.imageDataUrl) {
      payload.imageDataUrl = createGiftForm.imageDataUrl;
    }

    try {
      const response = await fetch(apiUrl(`/api/gifts/${currentUser.id_user}`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (response.status === 404) {
        clearAuthSession();
        setCreateGiftMessage('Пользователь не найден. Войдите снова.');
        return;
      }

      if (!response.ok || !data.success) {
        setCreateGiftMessage(data.error || 'Не удалось добавить подарок');
        return;
      }

      window.location.href = '/wishlists';
    } catch (error) {
      console.error('CREATE GIFT ERROR', error);
      setCreateGiftMessage('Сервер недоступен');
    } finally {
      setIsCreateGiftSubmitting(false);
    }
  }

  async function submitUpdateGift(event) {
    event.preventDefault();
    if (!currentUser || !currentUser.id_user || !viewingGiftId) {
      setCreateGiftMessage('Подарок не найден');
      return;
    }

    const title = createGiftForm.title.trim();
    if (!title) {
      setCreateGiftMessage('Укажите название подарка');
      return;
    }
    if (!createGiftForm.selectedWishlistIds.length) {
      setCreateGiftMessage('Выберите хотя бы один список желаний');
      return;
    }

    setIsCreateGiftSubmitting(true);
    setCreateGiftMessage('');
    const payload = {
      title,
      description: createGiftForm.description.trim() || undefined,
      price: createGiftForm.price.trim() || undefined,
      url: createGiftForm.url.trim() || undefined,
      wishlistIds: createGiftForm.selectedWishlistIds,
      imageDataUrl: createGiftForm.imageDataUrl || undefined,
    };
    try {
      const response = await fetch(apiUrl(`/api/gifts/${currentUser.id_user}/${viewingGiftId}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (response.status === 404) {
        setCreateGiftMessage(data.error || 'Подарок не найден');
        return;
      }
      if (!response.ok || !data.success) {
        setCreateGiftMessage(data.error || 'Не удалось сохранить подарок');
        return;
      }
      window.location.href = '/wishlists';
    } catch (error) {
      console.error('UPDATE GIFT ERROR', error);
      setCreateGiftMessage('Сервер недоступен');
    } finally {
      setIsCreateGiftSubmitting(false);
    }
  }

  async function deleteGiftFromDetails() {
    if (!currentUser?.id_user || !viewingGiftId) {
      return;
    }

    const linkedCount = createGiftForm.selectedWishlistIds.length;
    let scope = 'all';
    let wishlistId = '';
    const params = new URLSearchParams(window.location.search);
    const currentListId = String(params.get('list') || '').trim();

    const firstConfirm = window.confirm('Удалить подарок?');
    if (!firstConfirm) {
      return;
    }

    if (linkedCount > 1 && /^\d+$/.test(currentListId)) {
      const deleteEverywhere = window.confirm(
        'Подарок есть в нескольких списках.\nНажмите OK, чтобы удалить из всех списков.\nНажмите Отмена, чтобы удалить только из текущего списка.'
      );
      if (!deleteEverywhere) {
        scope = 'wishlist';
        wishlistId = currentListId;
      }
    }

    setIsCreateGiftSubmitting(true);
    setCreateGiftMessage('');
    try {
      const search = new URLSearchParams();
      search.set('scope', scope);
      if (scope === 'wishlist') {
        search.set('wishlistId', wishlistId);
      }
      const response = await fetch(
        apiUrl(`/api/gifts/${currentUser.id_user}/${viewingGiftId}?${search.toString()}`),
        { method: 'DELETE' }
      );
      const data = await response.json();
      if (!response.ok || !data.success) {
        setCreateGiftMessage(data.error || 'Не удалось удалить подарок');
        return;
      }
      window.location.href = '/wishlists';
    } catch (error) {
      console.error('DELETE GIFT ERROR', error);
      setCreateGiftMessage('Сервер недоступен');
    } finally {
      setIsCreateGiftSubmitting(false);
    }
  }

  return {
    wishlistIconPickerRef,
    createWishlistForm,
    setCreateWishlistForm,
    createWishlistMessage,
    isCreateWishlistSubmitting,
    submitCreateWishlist,
    selectWishlistIcon,
    createGiftForm,
    setCreateGiftForm,
    createGiftMessage,
    isCreateGiftSubmitting,
    giftDetailsWishlists,
    isGiftDetailsLoading,
    toggleGiftWishlist,
    handleGiftImageChange,
    submitCreateGift,
    submitUpdateGift,
    deleteGiftFromDetails,
  };
}
