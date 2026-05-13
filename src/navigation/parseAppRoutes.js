/**
 * Разбор window.location.pathname для «роутинга без библиотеки».
 * Держим в одном месте, чтобы MainLayout не разрастался условиями.
 * @param {string} browserPathname
 * @param {string} [browserSearch] — window.location.search (?…)
 */
export function parseAppRoutes(browserPathname, browserSearch = '') {
  const currentPathname =
    browserPathname === '/profile/settings' ? '/profile' : browserPathname;
  const pathNorm = browserPathname.replace(/\/$/, '') || '/';
  const showAiAssistantPage = pathNorm === '/ai';
  const showGiftsToFriendsPage = pathNorm === '/gifts';
  const showWishlistsPage = currentPathname === '/' || currentPathname.startsWith('/wishlists');
  const showFriendsPage = currentPathname.startsWith('/friends');
  const friendWishlistDetailMatch = browserPathname.match(/^\/friends\/wishlists\/(\d+)$/);
  const viewingFriendWishlistId = friendWishlistDetailMatch ? friendWishlistDetailMatch[1] : null;
  const showFriendWishlistDetailPage = Boolean(friendWishlistDetailMatch);

  let friendsPreviewOwnerIdUser = null;
  if (!showFriendWishlistDetailPage) {
    const friendsNorm = browserPathname.replace(/\/$/, '') || '/';
    if (friendsNorm === '/friends' && browserSearch) {
      const raw = browserSearch.startsWith('?') ? browserSearch.slice(1) : browserSearch;
      const previewRaw = new URLSearchParams(raw).get('preview');
      const previewTrim = previewRaw != null ? String(previewRaw).trim() : '';
      if (previewTrim && /^\d{1,8}$/.test(previewTrim)) {
        friendsPreviewOwnerIdUser = String(Number(previewTrim));
      }
    }
  }
  const wishlistEditPathMatch = browserPathname.match(/^\/wishlists\/(\d+)\/edit$/);
  const editingWishlistId = wishlistEditPathMatch ? wishlistEditPathMatch[1] : null;
  const showWishlistFormPage =
    browserPathname === '/wishlists/new' || Boolean(wishlistEditPathMatch);
  const showGiftFormPage = browserPathname === '/wishlists/gifts/new';
  const giftDetailsPathMatch = browserPathname.match(/^\/wishlists\/gifts\/(\d+)$/);
  const viewingGiftId = giftDetailsPathMatch ? giftDetailsPathMatch[1] : null;
  const showGiftDetailsPage = Boolean(giftDetailsPathMatch);
  const showWishlistsMainView =
    showWishlistsPage && !showWishlistFormPage && !showGiftFormPage && !showGiftDetailsPage;
  const showProfilePage = currentPathname === '/profile';

  let friendWishlistOwnerIdUser = null;
  if (showFriendWishlistDetailPage && browserSearch) {
    const raw = browserSearch.startsWith('?') ? browserSearch.slice(1) : browserSearch;
    const ownerRaw = new URLSearchParams(raw).get('owner');
    const ownerTrim = ownerRaw != null ? String(ownerRaw).trim() : '';
    if (ownerTrim && /^\d{1,8}$/.test(ownerTrim)) {
      friendWishlistOwnerIdUser = String(Number(ownerTrim));
    }
  }

  let giftDetailsContextListId = null;
  let giftDetailsOwnerIdUser = null;
  if (showGiftDetailsPage && browserSearch) {
    const raw = browserSearch.startsWith('?') ? browserSearch.slice(1) : browserSearch;
    const params = new URLSearchParams(raw);
    const list = params.get('list');
    if (list && /^\d+$/.test(String(list).trim())) {
      giftDetailsContextListId = String(Number(list));
    }
    const ownerRaw = params.get('owner');
    const ownerTrim = ownerRaw != null ? String(ownerRaw).trim() : '';
    if (ownerTrim && /^\d{1,8}$/.test(ownerTrim)) {
      giftDetailsOwnerIdUser = String(Number(ownerTrim));
    }
  }

  return {
    browserPathname,
    browserSearch: browserSearch || '',
    currentPathname,
    showWishlistsPage,
    showAiAssistantPage,
    showGiftsToFriendsPage,
    showFriendsPage,
    showFriendWishlistDetailPage,
    viewingFriendWishlistId,
    friendWishlistOwnerIdUser,
    editingWishlistId,
    showWishlistFormPage,
    showGiftFormPage,
    viewingGiftId,
    showGiftDetailsPage,
    giftDetailsContextListId,
    giftDetailsOwnerIdUser,
    showWishlistsMainView,
    showProfilePage,
    friendsPreviewOwnerIdUser,
  };
}
