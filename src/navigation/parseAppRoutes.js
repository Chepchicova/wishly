/**
 * Разбор window.location.pathname для «роутинга без библиотеки».
 * Держим в одном месте, чтобы MainLayout не разрастался условиями.
 * @param {string} browserPathname
 * @param {string} [browserSearch] — window.location.search (?…)
 */
export function parseAppRoutes(browserPathname, browserSearch = '') {
  const currentPathname =
    browserPathname === '/profile/settings' ? '/profile' : browserPathname;
  const showWishlistsPage = currentPathname === '/' || currentPathname.startsWith('/wishlists');
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

  let giftDetailsContextListId = null;
  if (showGiftDetailsPage && browserSearch) {
    const raw = browserSearch.startsWith('?') ? browserSearch.slice(1) : browserSearch;
    const list = new URLSearchParams(raw).get('list');
    if (list && /^\d+$/.test(String(list).trim())) {
      giftDetailsContextListId = String(Number(list));
    }
  }

  return {
    browserPathname,
    currentPathname,
    showWishlistsPage,
    editingWishlistId,
    showWishlistFormPage,
    showGiftFormPage,
    viewingGiftId,
    showGiftDetailsPage,
    giftDetailsContextListId,
    showWishlistsMainView,
    showProfilePage,
  };
}
