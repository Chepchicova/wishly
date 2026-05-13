import { useEffect, useRef, useState } from 'react';
import { apiUrl } from '../api/config';

function normalizeReservationDisplay(value) {
  const v = typeof value === 'string' ? value.trim() : '';
  if (v === 'show_without_name' || v === 'show_with_name' || v === 'hidden') {
    return v;
  }
  return 'hidden';
}

function wishlistToPrivacyFields(wishlist) {
  const st = typeof wishlist.status === 'string' ? wishlist.status : 'private';
  const allowed = Array.isArray(wishlist.allowedFriendIdUsers)
    ? wishlist.allowedFriendIdUsers.map((n) => Number(n)).filter((n) => Number.isInteger(n) && n > 0)
    : [];
  if (st === 'public') {
    return { privacyMode: 'public', allowedFriendIdUsers: [] };
  }
  if (st === 'private') {
    return { privacyMode: 'private', allowedFriendIdUsers: [] };
  }
  if (allowed.length > 0) {
    return { privacyMode: 'friends_selected', allowedFriendIdUsers: allowed };
  }
  return { privacyMode: 'friends_all', allowedFriendIdUsers: [] };
}

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
  browserSearch = '',
  giftDetailsOwnerIdUser = null,
  refreshFriendWishlistsForOwner,
}) {
  const wishlistIconPickerRef = useRef(null);

  const [createWishlistForm, setCreateWishlistForm] = useState({
    title: '',
    description: '',
    eventDate: '',
    icon: 'basic',
    privacyMode: 'private',
    allowedFriendIdUsers: [],
    reservationDisplay: 'hidden',
  });
  const [createWishlistMessage, setCreateWishlistMessage] = useState('');
  const [isCreateWishlistSubmitting, setIsCreateWishlistSubmitting] = useState(false);
  const [privacyFriendsList, setPrivacyFriendsList] = useState([]);
  const [isPrivacyFriendsLoading, setIsPrivacyFriendsLoading] = useState(false);

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
  const [giftReservation, setGiftReservation] = useState(null);
  const [isGiftReserveSubmitting, setIsGiftReserveSubmitting] = useState(false);
  const [isGiftReportSubmitting, setIsGiftReportSubmitting] = useState(false);
  const [ownerGiftStatus, setOwnerGiftStatus] = useState(null);
  const [isGiftFulfilledToggling, setIsGiftFulfilledToggling] = useState(false);

  useEffect(() => {
    if (browserPathname === '/wishlists/new') {
      setCreateWishlistForm({
        title: '',
        description: '',
        eventDate: '',
        icon: 'basic',
        privacyMode: 'private',
        allowedFriendIdUsers: [],
        reservationDisplay: 'hidden',
      });
      setCreateWishlistMessage('');
    }
  }, [browserPathname]);

  const isWishlistFormPath =
    browserPathname === '/wishlists/new' || /^\/wishlists\/\d+\/edit$/.test(browserPathname);

  useEffect(() => {
    if (!currentUser?.id_user || !isWishlistFormPath) {
      return;
    }
    let cancelled = false;
    async function loadFriendsForPrivacy() {
      setIsPrivacyFriendsLoading(true);
      try {
        const response = await fetch(apiUrl(`/api/friends/${currentUser.id_user}`));
        const data = await response.json();
        if (cancelled) {
          return;
        }
        if (response.ok && data.success && Array.isArray(data.friends)) {
          setPrivacyFriendsList(data.friends);
        } else {
          setPrivacyFriendsList([]);
        }
      } catch {
        if (!cancelled) {
          setPrivacyFriendsList([]);
        }
      } finally {
        if (!cancelled) {
          setIsPrivacyFriendsLoading(false);
        }
      }
    }
    loadFriendsForPrivacy();
    return () => {
      cancelled = true;
    };
  }, [currentUser?.id_user, isWishlistFormPath]);

  useEffect(() => {
    if (browserPathname !== '/wishlists/gifts/new') {
      return;
    }
    const raw = browserSearch.startsWith('?') ? browserSearch.slice(1) : browserSearch;
    const params = new URLSearchParams(raw);
    const listId = params.get('list');
    const initialLists =
      listId && /^\d+$/.test(String(listId).trim()) ? [String(Number(listId))] : [];
    const titleRaw = params.get('title');
    const descriptionRaw = params.get('description');
    const prefilledTitle =
      titleRaw != null ? String(titleRaw).trim().slice(0, 200) : '';
    const prefilledDescription =
      descriptionRaw != null ? String(descriptionRaw).trim().slice(0, 5000) : '';
    setCreateGiftForm({
      title: prefilledTitle,
      description: prefilledDescription,
      price: '',
      url: '',
      imageDataUrl: '',
      imagePath: '',
      selectedWishlistIds: initialLists,
    });
    setCreateGiftMessage('');
  }, [browserPathname, browserSearch]);

  useEffect(() => {
    if (!viewingGiftId || !currentUser?.id_user) {
      return;
    }

    let cancelled = false;
    async function loadGiftDetails() {
      setIsGiftDetailsLoading(true);
      setCreateGiftMessage('');
      setGiftReservation(null);
      setOwnerGiftStatus(null);
      const ownerKey =
        giftDetailsOwnerIdUser != null && String(giftDetailsOwnerIdUser).trim() !== ''
          ? String(Number(giftDetailsOwnerIdUser))
          : String(currentUser.id_user);
      const foreign = ownerKey !== String(currentUser.id_user);
      const forViewer = foreign
        ? `?forViewer=${encodeURIComponent(String(currentUser.id_user))}`
        : '';
      try {
        const response = await fetch(apiUrl(`/api/gifts/${ownerKey}/${viewingGiftId}${forViewer}`));
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
        if (response.status === 403) {
          setCreateGiftMessage(data.error || 'Нет доступа к подарку');
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
        setGiftReservation(
          data.gift.reservation && typeof data.gift.reservation === 'object'
            ? data.gift.reservation
            : null
        );
        setOwnerGiftStatus(
          data.gift && typeof data.gift.status === 'string' && data.gift.status.trim()
            ? data.gift.status.trim()
            : 'free'
        );
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
  }, [
    viewingGiftId,
    currentUser?.id_user,
    giftDetailsOwnerIdUser,
    clearAuthSession,
  ]);

  async function reserveFriendGift() {
    if (!currentUser?.id_user || !viewingGiftId || !giftDetailsOwnerIdUser) {
      return;
    }
    await reserveFriendGiftForOwner(viewingGiftId, giftDetailsOwnerIdUser);
  }

  async function reserveFriendGiftForOwner(giftId, ownerIdUserRaw) {
    if (!currentUser?.id_user || !giftId || ownerIdUserRaw == null || String(ownerIdUserRaw).trim() === '') {
      return;
    }
    const ownerKey = String(Number(ownerIdUserRaw));
    if (ownerKey === String(currentUser.id_user)) {
      return;
    }
    const gid = String(giftId).trim();
    setIsGiftReserveSubmitting(true);
    setCreateGiftMessage('');
    try {
      const response = await fetch(apiUrl(`/api/gifts/${currentUser.id_user}/${gid}/reserve`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({ ownerIdUser: Number(ownerKey) }),
      });
      const data = await response.json();
      if (response.status === 404 && data.error === 'Пользователь не найден') {
        clearAuthSession();
        setCreateGiftMessage('Пользователь не найден. Войдите снова.');
        return;
      }
      if (!response.ok || !data.success) {
        setCreateGiftMessage(data.error || 'Не удалось забронировать');
        return;
      }
      if (typeof refreshFriendWishlistsForOwner === 'function') {
        refreshFriendWishlistsForOwner(ownerKey);
      }
      const detailRes = await fetch(
        apiUrl(
          `/api/gifts/${ownerKey}/${gid}?forViewer=${encodeURIComponent(String(currentUser.id_user))}`
        )
      );
      const detailData = await detailRes.json();
      if (detailRes.ok && detailData.success && detailData.gift?.reservation) {
        setGiftReservation(detailData.gift.reservation);
      } else {
        setGiftReservation((prev) =>
          prev
            ? {
                ...prev,
                isReserved: true,
                reservedByMe: true,
                canReserve: false,
              }
            : prev
        );
      }
    } catch (error) {
      console.error('RESERVE GIFT ERROR', error);
      setCreateGiftMessage('Сервер недоступен');
    } finally {
      setIsGiftReserveSubmitting(false);
    }
  }

  /** @returns {Promise<{ ok: true } | { ok: false, error?: string }>} */
  async function cancelFriendGiftReservation() {
    if (!currentUser?.id_user || !viewingGiftId) {
      return { ok: false };
    }
    setIsGiftReserveSubmitting(true);
    setCreateGiftMessage('');
    try {
      const response = await fetch(
        apiUrl(`/api/gifts/${currentUser.id_user}/${viewingGiftId}/reserve`),
        { method: 'DELETE' }
      );
      const data = await response.json();
      if (response.status === 404 && data.error === 'Пользователь не найден') {
        clearAuthSession();
        const msg = 'Пользователь не найден. Войдите снова.';
        setCreateGiftMessage(msg);
        return { ok: false, error: msg };
      }
      if (!response.ok || !data.success) {
        const msg = data.error || 'Не удалось снять бронь';
        return { ok: false, error: msg };
      }
      const ownerKey =
        giftDetailsOwnerIdUser != null && String(giftDetailsOwnerIdUser).trim() !== ''
          ? String(Number(giftDetailsOwnerIdUser))
          : String(currentUser.id_user);
      if (typeof refreshFriendWishlistsForOwner === 'function') {
        refreshFriendWishlistsForOwner(ownerKey);
      }
      if (giftDetailsOwnerIdUser && String(Number(giftDetailsOwnerIdUser)) !== String(currentUser.id_user)) {
        const detailRes = await fetch(
          apiUrl(
            `/api/gifts/${ownerKey}/${viewingGiftId}?forViewer=${encodeURIComponent(String(currentUser.id_user))}`
          )
        );
        const detailData = await detailRes.json();
        if (detailRes.ok && detailData.success && detailData.gift?.reservation) {
          setGiftReservation(detailData.gift.reservation);
        }
      } else {
        setGiftReservation((prev) =>
          prev
            ? {
                ...prev,
                isReserved: false,
                reservedByMe: false,
                canReserve: true,
                reservationLabel: null,
              }
            : prev
        );
      }
      return { ok: true };
    } catch (error) {
      console.error('CANCEL RESERVATION ERROR', error);
      return { ok: false, error: 'Сервер недоступен' };
    } finally {
      setIsGiftReserveSubmitting(false);
    }
  }

  useEffect(() => {
    if (!editingWishlistId) {
      return;
    }
    const wishlist = wishlistsData.find((item) => item.id === editingWishlistId);
    if (!wishlist) {
      return;
    }
    const privacy = wishlistToPrivacyFields(wishlist);
    setCreateWishlistForm({
      title: wishlist.title,
      description: wishlist.description || '',
      eventDate: wishlist.eventDateIso || '',
      icon: wishlist.iconCode || 'basic',
      privacyMode: privacy.privacyMode,
      allowedFriendIdUsers: privacy.allowedFriendIdUsers,
      reservationDisplay: normalizeReservationDisplay(wishlist.reservationDisplay),
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

    if (
      createWishlistForm.privacyMode === 'friends_selected' &&
      (!createWishlistForm.allowedFriendIdUsers || createWishlistForm.allowedFriendIdUsers.length === 0)
    ) {
      setCreateWishlistMessage('Выберите хотя бы одного друга для доступа к списку');
      return;
    }

    setIsCreateWishlistSubmitting(true);
    setCreateWishlistMessage('');

    const payload = {
      title,
      description: createWishlistForm.description.trim() || undefined,
      dateEvent: createWishlistForm.eventDate || undefined,
      icon: createWishlistForm.icon,
      privacyMode: createWishlistForm.privacyMode,
      allowedFriendIdUsers:
        createWishlistForm.privacyMode === 'friends_selected'
          ? createWishlistForm.allowedFriendIdUsers
          : [],
      reservationDisplay: normalizeReservationDisplay(createWishlistForm.reservationDisplay),
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

  function setWishlistPrivacyMode(mode) {
    setCreateWishlistForm((previous) => ({
      ...previous,
      privacyMode: mode,
      allowedFriendIdUsers: mode === 'friends_selected' ? previous.allowedFriendIdUsers : [],
    }));
  }

  function setWishlistReservationDisplay(mode) {
    const next = normalizeReservationDisplay(mode);
    setCreateWishlistForm((previous) => ({ ...previous, reservationDisplay: next }));
  }

  function toggleWishlistPrivacyFriend(idUser) {
    const uid = Number(idUser);
    if (!Number.isInteger(uid) || uid <= 0) {
      return;
    }
    setCreateWishlistForm((previous) => {
      const set = new Set((previous.allowedFriendIdUsers || []).map(Number));
      if (set.has(uid)) {
        set.delete(uid);
      } else {
        set.add(uid);
      }
      return { ...previous, allowedFriendIdUsers: Array.from(set) };
    });
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

  async function deleteGiftFromDetails(skipInitialConfirm = false) {
    if (!currentUser?.id_user || !viewingGiftId) {
      return { ok: false, error: 'Подарок не найден' };
    }

    const linkedCount = createGiftForm.selectedWishlistIds.length;
    let scope = 'all';
    let wishlistId = '';
    const params = new URLSearchParams(window.location.search);
    const currentListId = String(params.get('list') || '').trim();

    if (!skipInitialConfirm) {
      const firstConfirm = window.confirm('Удалить подарок?');
      if (!firstConfirm) {
        return { ok: false, cancelled: true };
      }
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
        const err = data.error || 'Не удалось удалить подарок';
        setCreateGiftMessage(err);
        return { ok: false, error: err };
      }
      window.location.href = '/wishlists';
      return { ok: true };
    } catch (error) {
      console.error('DELETE GIFT ERROR', error);
      setCreateGiftMessage('Сервер недоступен');
      return { ok: false, error: 'Сервер недоступен' };
    } finally {
      setIsCreateGiftSubmitting(false);
    }
  }

  async function toggleOwnerGiftFulfillment() {
    if (!currentUser?.id_user || !viewingGiftId) {
      return;
    }
    if (ownerGiftStatus == null) {
      return;
    }
    if (giftDetailsOwnerIdUser != null && String(Number(giftDetailsOwnerIdUser)) !== String(currentUser.id_user)) {
      return;
    }
    const wantFulfilled = ownerGiftStatus !== 'gifted';
    setIsGiftFulfilledToggling(true);
    setCreateGiftMessage('');
    try {
      const gid = String(viewingGiftId).trim();
      const response = await fetch(apiUrl(`/api/gifts/${currentUser.id_user}/${gid}/fulfillment`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({ fulfilled: wantFulfilled }),
      });
      const data = await response.json();
      if (response.status === 404 && data.error === 'Пользователь не найден') {
        clearAuthSession();
        setCreateGiftMessage(data.error || 'Пользователь не найден');
        return;
      }
      if (!response.ok || !data.success) {
        setCreateGiftMessage(data.error || 'Не удалось изменить статус желания');
        return;
      }
      if (typeof data.status === 'string' && data.status.trim()) {
        setOwnerGiftStatus(data.status.trim());
      } else {
        setOwnerGiftStatus(wantFulfilled ? 'gifted' : 'free');
      }
    } catch (error) {
      console.error('TOGGLE GIFT FULFILLMENT ERROR', error);
      setCreateGiftMessage('Сервер недоступен');
    } finally {
      setIsGiftFulfilledToggling(false);
    }
  }

  /** Жалоба на подарок друга (POST /api/gifts/…/report). */
  async function submitGiftReport({ reasonId, description, contextWishlistId }) {
    if (!currentUser?.id_user || !viewingGiftId || giftDetailsOwnerIdUser == null) {
      return { ok: false, error: 'Недостаточно данных для жалобы' };
    }
    const ownerKey = String(Number(giftDetailsOwnerIdUser));
    if (ownerKey === String(currentUser.id_user)) {
      return { ok: false, error: 'Нельзя пожаловаться на свой подарок' };
    }
    const gid = String(viewingGiftId).trim();
    const body = {
      ownerIdUser: Number(ownerKey),
      reason: String(reasonId || '').trim().toLowerCase(),
      description: typeof description === 'string' ? description.trim() : '',
    };
    const wlRaw = contextWishlistId != null ? String(contextWishlistId).trim() : '';
    if (wlRaw && /^\d+$/.test(wlRaw)) {
      body.wishlistId = Number(wlRaw);
    }
    setIsGiftReportSubmitting(true);
    try {
      const response = await fetch(apiUrl(`/api/gifts/${currentUser.id_user}/${gid}/report`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (response.status === 404 && data.error === 'Пользователь не найден') {
        clearAuthSession();
        return { ok: false, error: data.error || 'Пользователь не найден' };
      }
      if (!response.ok || !data.success) {
        return { ok: false, error: data.error || 'Не удалось отправить жалобу' };
      }
      return { ok: true };
    } catch (error) {
      console.error('GIFT REPORT ERROR', error);
      return { ok: false, error: 'Сервер недоступен' };
    } finally {
      setIsGiftReportSubmitting(false);
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
    privacyFriendsList,
    isPrivacyFriendsLoading,
    setWishlistPrivacyMode,
    setWishlistReservationDisplay,
    toggleWishlistPrivacyFriend,
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
    giftReservation,
    isGiftReserveSubmitting,
    reserveFriendGift,
    cancelFriendGiftReservation,
    submitGiftReport,
    isGiftReportSubmitting,
    ownerGiftStatus,
    isGiftFulfilledToggling,
    toggleOwnerGiftFulfillment,
  };
}
