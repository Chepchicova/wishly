import { useCallback, useEffect, useState } from 'react';
import { apiUrl } from '../api/config';
import { getWishlistIconUrl } from '../constants/wishlistIcons';
import { formatEventDateForDisplay } from '../utils/dateFormat';

function mapFriendWishlistsFromApi(list) {
  return (list || []).map((wishlist) => {
    const rawEvent = wishlist.eventDate != null ? String(wishlist.eventDate).trim() : '';
    const eventDateIso = /^\d{4}-\d{2}-\d{2}$/.test(rawEvent) ? rawEvent : '';
    return {
      ...wishlist,
      iconCode: wishlist.icon || 'basic',
      icon: getWishlistIconUrl(wishlist.icon),
      eventDate: formatEventDateForDisplay(wishlist.eventDate),
      eventDateIso,
      wishes: Array.isArray(wishlist.wishes)
        ? wishlist.wishes.map((w) => ({
            ...w,
            isReserved:
              typeof w.isReserved === 'boolean'
                ? w.isReserved
                : Boolean(w.reservationLabel),
          }))
        : [],
    };
  });
}

export function useFriendsState(
  currentUser,
  clearAuthSession,
  showFriendsPage,
  friendsPreviewOwnerIdUser = null,
  showGiftsToFriendsPage = false,
  showAiAssistantPage = false
) {
  const [friendsData, setFriendsData] = useState([]);
  const [isFriendsLoading, setIsFriendsLoading] = useState(false);
  const [friendsMessage, setFriendsMessage] = useState('');
  const [selectedFriendId, setSelectedFriendId] = useState('');
  const [friendWishlistsByOwnerIdUser, setFriendWishlistsByOwnerIdUser] = useState({});
  const [friendWishlistsLoadingKey, setFriendWishlistsLoadingKey] = useState('');

  const [findByIdUserValue, setFindByIdUserValue] = useState('');
  const [findMessage, setFindMessage] = useState('');
  const [isFindLoading, setIsFindLoading] = useState(false);
  const [foundUser, setFoundUser] = useState(null);
  const [isSendingRequest, setIsSendingRequest] = useState(false);
  const [isCancellingRequest, setIsCancellingRequest] = useState(false);
  const [isRemovingFriend, setIsRemovingFriend] = useState(false);
  const [incomingFriendRequests, setIncomingFriendRequests] = useState([]);
  const [isIncomingLoading, setIsIncomingLoading] = useState(false);
  const [incomingMessage, setIncomingMessage] = useState('');
  const [respondingRequestId, setRespondingRequestId] = useState(null);
  const [requestsTabPreviewProfile, setRequestsTabPreviewProfile] = useState(null);
  const [requestsTabPreviewWishlists, setRequestsTabPreviewWishlists] = useState([]);
  const [requestsTabPreviewLoading, setRequestsTabPreviewLoading] = useState(false);
  const [requestsTabPreviewError, setRequestsTabPreviewError] = useState('');

  const [giftsToFriends, setGiftsToFriends] = useState([]);
  const [isGiftsToFriendsLoading, setIsGiftsToFriendsLoading] = useState(false);
  const [giftsToFriendsMessage, setGiftsToFriendsMessage] = useState('');

  const selectedFriend =
    friendsData.find((friend) => friend.id === selectedFriendId) || friendsData[0] || null;

  useEffect(() => {
    if (friendsData.length === 0) {
      if (selectedFriendId) {
        setSelectedFriendId('');
      }
      return;
    }
    if (!selectedFriendId) {
      setSelectedFriendId(friendsData[0].id);
      return;
    }
    const selectedStillExists = friendsData.some((friend) => friend.id === selectedFriendId);
    if (!selectedStillExists) {
      setSelectedFriendId(friendsData[0].id);
    }
  }, [friendsData, selectedFriendId]);

  const loadFriends = useCallback(async () => {
    if (!currentUser?.id_user) {
      setFriendsData([]);
      setFriendsMessage('Войдите, чтобы видеть список друзей');
      return;
    }

    setIsFriendsLoading(true);
    setFriendsMessage('');
    try {
      const response = await fetch(apiUrl(`/api/friends/${currentUser.id_user}`));
      const data = await response.json();

      if (response.status === 404 && data.error === 'Пользователь не найден') {
        clearAuthSession();
        setFriendsData([]);
        setFriendsMessage('Пользователь не найден в базе. Войдите снова.');
        return;
      }

      if (!response.ok || !data.success) {
        setFriendsData([]);
        setFriendsMessage(data.error || 'Не удалось загрузить друзей');
        return;
      }

      setFriendsData(Array.isArray(data.friends) ? data.friends : []);
      setFriendsMessage('');
    } catch (error) {
      console.error('FRIENDS LOAD ERROR', error);
      setFriendsData([]);
      setFriendsMessage('Сервер недоступен');
    } finally {
      setIsFriendsLoading(false);
    }
  }, [currentUser?.id_user, clearAuthSession]);

  const loadIncomingFriendRequests = useCallback(async () => {
    if (!currentUser?.id_user) {
      setIncomingFriendRequests([]);
      return;
    }
    setIsIncomingLoading(true);
    setIncomingMessage('');
    try {
      const response = await fetch(apiUrl(`/api/friends/${currentUser.id_user}/incoming-requests`));
      const data = await response.json();
      if (response.status === 404 && data.error === 'Пользователь не найден') {
        clearAuthSession();
        setIncomingFriendRequests([]);
        return;
      }
      if (!response.ok || !data.success) {
        setIncomingFriendRequests([]);
        setIncomingMessage(data.error || 'Не удалось загрузить заявки');
        return;
      }
      setIncomingFriendRequests(Array.isArray(data.requests) ? data.requests : []);
    } catch (error) {
      console.error('INCOMING FRIEND REQUESTS LOAD ERROR', error);
      setIncomingFriendRequests([]);
      setIncomingMessage('Сервер недоступен');
    } finally {
      setIsIncomingLoading(false);
    }
  }, [currentUser?.id_user, clearAuthSession]);

  const loadGiftsToFriends = useCallback(async () => {
    if (!currentUser?.id_user) {
      setGiftsToFriends([]);
      setGiftsToFriendsMessage('');
      return;
    }
    setIsGiftsToFriendsLoading(true);
    setGiftsToFriendsMessage('');
    try {
      const response = await fetch(apiUrl(`/api/friends/${currentUser.id_user}/gifts-to-friends`));
      const data = await response.json();
      if (response.status === 404 && data.error === 'Пользователь не найден') {
        clearAuthSession();
        setGiftsToFriends([]);
        return;
      }
      if (!response.ok || !data.success) {
        setGiftsToFriends([]);
        setGiftsToFriendsMessage(data.error || 'Не удалось загрузить список');
        return;
      }
      setGiftsToFriends(Array.isArray(data.items) ? data.items : []);
    } catch (error) {
      console.error('GIFTS TO FRIENDS LOAD ERROR', error);
      setGiftsToFriends([]);
      setGiftsToFriendsMessage('Сервер недоступен');
    } finally {
      setIsGiftsToFriendsLoading(false);
    }
  }, [currentUser?.id_user, clearAuthSession]);

  useEffect(() => {
    if (showGiftsToFriendsPage && currentUser?.id_user) {
      loadGiftsToFriends();
    }
  }, [showGiftsToFriendsPage, currentUser?.id_user, loadGiftsToFriends]);

  useEffect(() => {
    if (!currentUser?.id_user) {
      return;
    }
    if (showFriendsPage) {
      loadFriends();
      loadIncomingFriendRequests();
    } else if (showAiAssistantPage) {
      loadFriends();
    }
  }, [
    showFriendsPage,
    showAiAssistantPage,
    currentUser?.id_user,
    loadFriends,
    loadIncomingFriendRequests,
  ]);

  useEffect(() => {
    if (!showFriendsPage || !currentUser?.id_user) {
      setRequestsTabPreviewProfile(null);
      setRequestsTabPreviewWishlists([]);
      setRequestsTabPreviewLoading(false);
      setRequestsTabPreviewError('');
      return;
    }
    if (!friendsPreviewOwnerIdUser) {
      setRequestsTabPreviewProfile(null);
      setRequestsTabPreviewWishlists([]);
      setRequestsTabPreviewLoading(false);
      setRequestsTabPreviewError('');
      return;
    }
    let cancelled = false;
    async function loadPreview() {
      setRequestsTabPreviewLoading(true);
      setRequestsTabPreviewError('');
      try {
        const response = await fetch(
          apiUrl(
            `/api/friends/${currentUser.id_user}/user/${encodeURIComponent(friendsPreviewOwnerIdUser)}/preview`
          )
        );
        const data = await response.json();
        if (cancelled) {
          return;
        }
        if (response.status === 404 && data.error === 'Пользователь не найден') {
          clearAuthSession();
          return;
        }
        if (!response.ok || !data.success) {
          setRequestsTabPreviewProfile(null);
          setRequestsTabPreviewWishlists([]);
          setRequestsTabPreviewError(data.error || 'Не удалось загрузить профиль');
          return;
        }
        setRequestsTabPreviewProfile(data.profile || null);
        setRequestsTabPreviewWishlists(mapFriendWishlistsFromApi(data.wishlists));
      } catch (error) {
        if (!cancelled) {
          console.error('REQUESTS TAB PREVIEW LOAD ERROR', error);
          setRequestsTabPreviewProfile(null);
          setRequestsTabPreviewWishlists([]);
          setRequestsTabPreviewError('Сервер недоступен');
        }
      } finally {
        if (!cancelled) {
          setRequestsTabPreviewLoading(false);
        }
      }
    }
    loadPreview();
    return () => {
      cancelled = true;
    };
  }, [showFriendsPage, currentUser?.id_user, friendsPreviewOwnerIdUser, clearAuthSession]);

  const fetchFriendWishlistsForOwner = useCallback(
    async (ownerIdUser) => {
      if (!currentUser?.id_user || ownerIdUser == null || ownerIdUser === '') {
        return;
      }
      const key = String(Number(ownerIdUser));
      setFriendWishlistsLoadingKey(key);
      try {
        const response = await fetch(apiUrl(`/api/friends/${currentUser.id_user}/wishlists/${key}`));
        const data = await response.json();

        if (response.status === 404 && data.error === 'Пользователь не найден') {
          clearAuthSession();
          return;
        }

        if (!response.ok || !data.success) {
          setFriendWishlistsByOwnerIdUser((prev) => ({ ...prev, [key]: [] }));
          return;
        }

        setFriendWishlistsByOwnerIdUser((prev) => ({
          ...prev,
          [key]: mapFriendWishlistsFromApi(data.wishlists),
        }));
      } catch (error) {
        console.error('FRIEND WISHLISTS LOAD ERROR', error);
        setFriendWishlistsByOwnerIdUser((prev) => ({ ...prev, [key]: [] }));
      } finally {
        setFriendWishlistsLoadingKey((k) => (k === key ? '' : k));
      }
    },
    [currentUser?.id_user, clearAuthSession]
  );

  useEffect(() => {
    if (!showFriendsPage || !currentUser?.id_user || !selectedFriend?.id_user) {
      return;
    }
    fetchFriendWishlistsForOwner(selectedFriend.id_user);
  }, [showFriendsPage, currentUser?.id_user, selectedFriend?.id_user, fetchFriendWishlistsForOwner]);

  const selectedFriendWishlistsKey = selectedFriend ? String(selectedFriend.id_user) : '';
  const selectedFriendWishlists = selectedFriendWishlistsKey
    ? friendWishlistsByOwnerIdUser[selectedFriendWishlistsKey]
    : undefined;
  const isSelectedFriendWishlistsLoading = Boolean(
    selectedFriendWishlistsKey && friendWishlistsLoadingKey === selectedFriendWishlistsKey
  );

  const findUserByIdUser = useCallback(async () => {
    if (!currentUser?.id_user) {
      setFindMessage('Нужно войти в аккаунт');
      setFoundUser(null);
      return;
    }

    const clean = String(findByIdUserValue || '').trim();
    if (!/^\d{1,8}$/.test(clean)) {
      setFindMessage('Введите корректный ID');
      setFoundUser(null);
      return;
    }

    setIsFindLoading(true);
    setFindMessage('');
    setFoundUser(null);
    try {
      const response = await fetch(apiUrl(`/api/friends/${currentUser.id_user}/search/${clean}`));
      const data = await response.json();

      if (response.status === 404) {
        setFindMessage(data.error || 'Пользователь не найден');
        return;
      }

      if (!response.ok || !data.success) {
        setFindMessage(data.error || 'Не удалось найти пользователя');
        return;
      }

      setFoundUser(data.user || null);
      setFindMessage('');
    } catch (error) {
      console.error('FIND USER BY ID_USER ERROR', error);
      setFindMessage('Сервер недоступен');
    } finally {
      setIsFindLoading(false);
    }
  }, [currentUser?.id_user, findByIdUserValue]);

  const sendFriendRequest = useCallback(async () => {
    if (!currentUser?.id_user || !foundUser?.id_user) {
      return;
    }

    setIsSendingRequest(true);
    setFindMessage('');
    try {
      const response = await fetch(apiUrl(`/api/friends/${currentUser.id_user}/requests`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({ toIdUser: foundUser.id_user }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        setFindMessage(data.error || 'Не удалось отправить заявку');
        return;
      }

      const nextStatus = data.request?.status || 'pending';
      setFoundUser((previous) => (previous ? { ...previous, relationStatus: nextStatus } : previous));
      setFindMessage('Заявка отправлена');
    } catch (error) {
      console.error('SEND FRIEND REQUEST ERROR', error);
      setFindMessage('Сервер недоступен');
    } finally {
      setIsSendingRequest(false);
    }
  }, [currentUser?.id_user, foundUser]);

  const cancelOutgoingFriendRequest = useCallback(async () => {
    if (!currentUser?.id_user || !foundUser?.id_user) {
      return;
    }
    setIsCancellingRequest(true);
    setFindMessage('');
    try {
      const response = await fetch(
        apiUrl(
          `/api/friends/${currentUser.id_user}/outgoing-pending/${encodeURIComponent(String(foundUser.id_user))}`
        ),
        { method: 'DELETE' }
      );
      const data = await response.json();
      if (response.status === 404 && data.error === 'Пользователь не найден') {
        clearAuthSession();
        return;
      }
      if (!response.ok || !data.success) {
        setFindMessage(data.error || 'Не удалось отменить заявку');
        return;
      }
      setFoundUser((previous) => (previous ? { ...previous, relationStatus: 'none' } : previous));
      setFindMessage('Заявка отменена');
    } catch (error) {
      console.error('CANCEL OUTGOING FRIEND REQUEST ERROR', error);
      setFindMessage('Сервер недоступен');
    } finally {
      setIsCancellingRequest(false);
    }
  }, [currentUser?.id_user, foundUser, clearAuthSession]);

  const respondToFriendRequest = useCallback(
    async (requestId, action) => {
      if (!currentUser?.id_user || !requestId) {
        return;
      }
      const rid = String(requestId).trim();
      setRespondingRequestId(rid);
      setIncomingMessage('');
      try {
        const response = await fetch(apiUrl(`/api/friends/${currentUser.id_user}/requests/${rid}`), {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
          body: JSON.stringify({ action }),
        });
        const data = await response.json();
        if (response.status === 404 && data.error === 'Пользователь не найден') {
          clearAuthSession();
          return;
        }
        if (!response.ok || !data.success) {
          setIncomingMessage(data.error || 'Не удалось обработать заявку');
          return;
        }
        await loadIncomingFriendRequests();
        await loadFriends();
      } catch (error) {
        console.error('RESPOND FRIEND REQUEST ERROR', error);
        setIncomingMessage('Сервер недоступен');
      } finally {
        setRespondingRequestId(null);
      }
    },
    [currentUser?.id_user, clearAuthSession, loadIncomingFriendRequests, loadFriends]
  );

  const removeFriend = useCallback(
    async (friendIdUser) => {
      if (!currentUser?.id_user || friendIdUser == null || friendIdUser === '') {
        return { ok: false, error: 'Нет данных для удаления' };
      }
      const fid = String(friendIdUser).trim();
      setIsRemovingFriend(true);
      setFriendsMessage('');
      try {
        const response = await fetch(
          apiUrl(`/api/friends/${currentUser.id_user}/friend/${encodeURIComponent(fid)}`),
          { method: 'DELETE' }
        );
        const data = await response.json();
        if (response.status === 404 && data.error === 'Пользователь не найден') {
          clearAuthSession();
          return { ok: false, error: data.error || 'Пользователь не найден' };
        }
        if (!response.ok || !data.success) {
          const err = data.error || 'Не удалось удалить из друзей';
          return { ok: false, error: err };
        }
        setFriendWishlistsByOwnerIdUser((prev) => {
          const next = { ...prev };
          delete next[String(Number(fid))];
          return next;
        });
        await loadFriends();
        await loadIncomingFriendRequests();
        return { ok: true };
      } catch (error) {
        console.error('REMOVE FRIEND ERROR', error);
        return { ok: false, error: 'Сервер недоступен' };
      } finally {
        setIsRemovingFriend(false);
      }
    },
    [currentUser?.id_user, clearAuthSession, loadFriends, loadIncomingFriendRequests]
  );

  return {
    friendsData,
    isFriendsLoading,
    friendsMessage,
    selectedFriendId,
    setSelectedFriendId,
    selectedFriend,
    loadFriends,
    findByIdUserValue,
    setFindByIdUserValue,
    findMessage,
    isFindLoading,
    foundUser,
    findUserByIdUser,
    sendFriendRequest,
    isSendingRequest,
    cancelOutgoingFriendRequest,
    isCancellingRequest,
    incomingFriendRequests,
    isIncomingLoading,
    incomingMessage,
    loadIncomingFriendRequests,
    respondToFriendRequest,
    respondingRequestId,
    requestsTabPreviewProfile,
    requestsTabPreviewWishlists,
    requestsTabPreviewLoading,
    requestsTabPreviewError,
    friendWishlistsByOwnerIdUser,
    friendWishlistsLoadingKey,
    fetchFriendWishlistsForOwner,
    selectedFriendWishlists,
    isSelectedFriendWishlistsLoading,
    removeFriend,
    isRemovingFriend,
    giftsToFriends,
    isGiftsToFriendsLoading,
    giftsToFriendsMessage,
    loadGiftsToFriends,
  };
}
