import { useEffect, useState } from 'react';
import './AppShell.css';
import './AppThemeLight.css';
import './SharedUi.css';

import AuthModal from './AuthModal';
import DeleteWishlistConfirmModal from './DeleteWishlistConfirmModal';
import PrivacyModal from './PrivacyModal';
import SiteFooter from './SiteFooter';
import SiteHeader from './SiteHeader';
import CreateGiftPage from '../pages/CreateGiftPage';
import GiftDetailsPage from '../pages/GiftDetailsPage';
import CreateWishlistPage from '../pages/CreateWishlistPage';
import ProfilePage from '../pages/ProfilePage';
import WishlistsPage from '../pages/WishlistsPage';
import { parseAppRoutes } from '../navigation/parseAppRoutes';
import { useAppTheme } from '../hooks/useAppTheme';
import { useAuthSession } from '../hooks/useAuthSession';
import { useGiftWishlistForms } from '../hooks/useGiftWishlistForms';
import { useProfileState } from '../hooks/useProfileState';
import { useWishlistsState } from '../hooks/useWishlistsState';

/**
 * Компоновщик экрана: маршруты + хуки по доменам + разметка.
 * Паттерн: «тонкий layout», логика в hooks/ и navigation/.
 */
function findWishlistIdContainingGift(wishlistsData, giftIdStr) {
  const gid = String(giftIdStr);
  for (const w of wishlistsData) {
    if (!Array.isArray(w.wishes)) {
      continue;
    }
    if (w.wishes.some((x) => String(x.giftId) === gid)) {
      return w.id;
    }
  }
  return null;
}

export default function MainLayout() {
  const routes = parseAppRoutes(window.location.pathname, window.location.search);

  const auth = useAuthSession();
  const { isDarkTheme, setIsDarkTheme } = useAppTheme();

  const wishlists = useWishlistsState(
    auth.currentUser,
    auth.clearAuthSession,
    routes.showWishlistsPage
  );

  const profile = useProfileState({
    currentUser: auth.currentUser,
    saveUser: auth.saveUser,
    clearAuthSession: auth.clearAuthSession,
    showProfilePage: routes.showProfilePage,
  });

  const forms = useGiftWishlistForms({
    currentUser: auth.currentUser,
    clearAuthSession: auth.clearAuthSession,
    wishlistsData: wishlists.wishlistsData,
    editingWishlistId: routes.editingWishlistId,
    viewingGiftId: routes.viewingGiftId,
    browserPathname: routes.browserPathname,
  });

  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);

  const setProfileMenuOpen = profile.setIsProfileMenuOpen;
  const wishlistMenuOpen = wishlists.isMenuOpen;
  const setWishlistMenuOpen = wishlists.setIsMenuOpen;
  const wishlistDotsMenuRef = wishlists.wishlistDotsMenuRef;
  const profileMenuOpen = profile.isProfileMenuOpen;
  const profileDotsMenuRef = profile.profileDotsMenuRef;

  useEffect(() => {
    if (window.location.pathname === '/profile/settings') {
      window.history.replaceState({}, '', '/profile');
    }
  }, []);

  useEffect(() => {
    if (!routes.showProfilePage) {
      setProfileMenuOpen(false);
    }
  }, [routes.showProfilePage, setProfileMenuOpen]);

  let giftDetailsResolvedListId = routes.giftDetailsContextListId;
  if (!giftDetailsResolvedListId && forms.createGiftForm.selectedWishlistIds?.length) {
    const hit = forms.createGiftForm.selectedWishlistIds
      .map(String)
      .find((id) => wishlists.wishlistsData.some((w) => w.id === id));
    if (hit) {
      giftDetailsResolvedListId = hit;
    }
  }
  if (!giftDetailsResolvedListId && routes.viewingGiftId) {
    giftDetailsResolvedListId = findWishlistIdContainingGift(
      wishlists.wishlistsData,
      routes.viewingGiftId
    );
  }

  const giftDetailsContextWishlist = giftDetailsResolvedListId
    ? wishlists.wishlistsData.find((w) => w.id === String(giftDetailsResolvedListId))
    : null;

  const giftDetailsSiblingGifts =
    giftDetailsContextWishlist && Array.isArray(giftDetailsContextWishlist.wishes)
      ? giftDetailsContextWishlist.wishes
          .map((wish) => ({
            giftId: String(wish.giftId),
            title: wish.title || 'Без названия',
            note: wish.note || '',
            price: wish.price,
            imagePath: wish.imagePath,
          }))
          .filter((row) => row.giftId !== String(routes.viewingGiftId))
      : [];

  const giftDetailsBackHref = giftDetailsResolvedListId
    ? `/wishlists?list=${encodeURIComponent(String(giftDetailsResolvedListId))}`
    : '/wishlists';

  useEffect(() => {
    if (!wishlistMenuOpen && !profileMenuOpen) {
      return undefined;
    }

    function handleDocumentMouseDown(event) {
      if (wishlistMenuOpen) {
        const root = wishlistDotsMenuRef.current;
        if (!root || !root.contains(event.target)) {
          setWishlistMenuOpen(false);
        }
      }
      if (profileMenuOpen) {
        const root = profileDotsMenuRef.current;
        if (!root || !root.contains(event.target)) {
          setProfileMenuOpen(false);
        }
      }
    }

    document.addEventListener('mousedown', handleDocumentMouseDown);
    return () => document.removeEventListener('mousedown', handleDocumentMouseDown);
  }, [
    wishlistMenuOpen,
    setWishlistMenuOpen,
    wishlistDotsMenuRef,
    profileMenuOpen,
    setProfileMenuOpen,
    profileDotsMenuRef,
  ]);

  return (
    <div className={`app-shell${isDarkTheme ? '' : ' app-shell--theme-light'}`}>
      <SiteHeader
        currentPathname={routes.currentPathname}
        currentUser={auth.currentUser}
        onOpenLogin={auth.openLoginModal}
      />

      <main className="site-main">
        {routes.showWishlistsMainView && (
          <WishlistsPage
            searchText={wishlists.searchText}
            onSearchTextChange={wishlists.setSearchText}
            isWishlistsLoading={wishlists.isWishlistsLoading}
            visibleWishlists={wishlists.visibleWishlists}
            selectedWishlist={wishlists.selectedWishlist}
            onSelectWishlist={(id) => {
              wishlists.setSelectedWishlistId(id);
              wishlists.setIsMenuOpen(false);
            }}
            wishlistsMessage={wishlists.wishlistsMessage}
            currentUser={auth.currentUser}
            onOpenLogin={auth.openLoginModal}
            isMenuOpen={wishlists.isMenuOpen}
            onToggleWishlistMenu={() => wishlists.setIsMenuOpen((previousState) => !previousState)}
            wishlistDotsMenuRef={wishlists.wishlistDotsMenuRef}
            onRequestDeleteWishlist={wishlists.requestDeleteWishlist}
            onCloseWishlistMenu={() => wishlists.setIsMenuOpen(false)}
          />
        )}

        {routes.showGiftFormPage && (
          <CreateGiftPage
            currentUser={auth.currentUser}
            onOpenLogin={auth.openLoginModal}
            createGiftForm={forms.createGiftForm}
            onCreateGiftFormChange={forms.setCreateGiftForm}
            onToggleGiftWishlist={forms.toggleGiftWishlist}
            onSubmitCreateGift={forms.submitCreateGift}
            createGiftMessage={forms.createGiftMessage}
            isCreateGiftSubmitting={forms.isCreateGiftSubmitting}
            userWishlists={wishlists.wishlistsData.map((w) => ({ id: w.id, title: w.title }))}
            onGiftImageChange={forms.handleGiftImageChange}
          />
        )}

        {routes.showGiftDetailsPage && (
          <GiftDetailsPage
            currentUser={auth.currentUser}
            onOpenLogin={auth.openLoginModal}
            createGiftForm={forms.createGiftForm}
            onCreateGiftFormChange={forms.setCreateGiftForm}
            onToggleGiftWishlist={forms.toggleGiftWishlist}
            onGiftImageChange={forms.handleGiftImageChange}
            onSubmitSaveGift={forms.submitUpdateGift}
            onDeleteGift={forms.deleteGiftFromDetails}
            isGiftLoading={forms.isGiftDetailsLoading}
            giftMessage={forms.createGiftMessage}
            isCreateGiftSubmitting={forms.isCreateGiftSubmitting}
            userWishlists={wishlists.wishlistsData.map((w) => ({ id: w.id, title: w.title }))}
            giftWishlists={forms.giftDetailsWishlists}
            giftId={routes.viewingGiftId}
            backHref={giftDetailsBackHref}
            contextListId={giftDetailsResolvedListId}
            contextListTitle={giftDetailsContextWishlist?.title || ''}
            contextListMissing={
              Boolean(giftDetailsResolvedListId) && !giftDetailsContextWishlist && !wishlists.isWishlistsLoading
            }
            siblingGifts={giftDetailsSiblingGifts}
            isWishlistsLoading={wishlists.isWishlistsLoading}
          />
        )}

        {routes.showWishlistFormPage && (
          <CreateWishlistPage
            currentUser={auth.currentUser}
            onOpenLogin={auth.openLoginModal}
            wishlistFormIsEdit={Boolean(routes.editingWishlistId)}
            wishlistFormEditState={
              !routes.editingWishlistId
                ? 'na'
                : !auth.currentUser
                  ? 'na'
                  : wishlists.isWishlistsLoading
                    ? 'loading'
                    : wishlists.wishlistsData.some((w) => w.id === routes.editingWishlistId)
                      ? 'ready'
                      : 'missing'
            }
            createWishlistForm={forms.createWishlistForm}
            onCreateWishlistFormChange={forms.setCreateWishlistForm}
            onSubmitCreateWishlist={forms.submitCreateWishlist}
            createWishlistMessage={forms.createWishlistMessage}
            isCreateWishlistSubmitting={forms.isCreateWishlistSubmitting}
            wishlistIconPickerRef={forms.wishlistIconPickerRef}
            onSelectWishlistIcon={forms.selectWishlistIcon}
            onOpenPrivacyModal={() => setIsPrivacyModalOpen(true)}
          />
        )}

        {routes.showProfilePage && (
          <ProfilePage
            currentUser={auth.currentUser}
            onOpenLogin={auth.openLoginModal}
            profileData={profile.profileData}
            isProfileLoading={profile.isProfileLoading}
            profileMessage={profile.profileMessage}
            profileForm={profile.profileForm}
            onProfileFormChange={profile.setProfileForm}
            isProfileEditMode={profile.isProfileEditMode}
            onSetProfileEditMode={profile.setIsProfileEditMode}
            onBeginProfileEdit={() => {
              profile.setIsProfileEditMode(true);
              profile.setIsProfileMenuOpen(false);
            }}
            isProfileMenuOpen={profile.isProfileMenuOpen}
            onToggleProfileMenu={() => profile.setIsProfileMenuOpen((previous) => !previous)}
            profileDotsMenuRef={profile.profileDotsMenuRef}
            showIdCopiedHint={profile.showIdCopiedHint}
            onSaveProfile={profile.saveProfile}
            onProfilePhotoChange={profile.handleProfilePhotoChange}
            onCopyProfileId={profile.copyProfileIdUser}
            onLogout={auth.logoutUser}
            isDarkTheme={isDarkTheme}
            onToggleDarkTheme={() => setIsDarkTheme((previous) => !previous)}
          />
        )}
      </main>

      <SiteFooter />

      {auth.isAuthModalOpen && (
        <AuthModal
          authMode={auth.authMode}
          onClose={auth.closeAuthModal}
          onSetAuthMode={auth.setAuthMode}
          loginForm={auth.loginForm}
          onLoginFormChange={auth.setLoginForm}
          registerForm={auth.registerForm}
          onRegisterFormChange={auth.setRegisterForm}
          onSubmitLogin={auth.sendLogin}
          onSubmitRegister={auth.sendRegister}
          authMessage={auth.authMessage}
          isAuthLoading={auth.isAuthLoading}
        />
      )}

      {isPrivacyModalOpen && <PrivacyModal onClose={() => setIsPrivacyModalOpen(false)} />}

      {wishlists.deleteWishlistTarget && (
        <DeleteWishlistConfirmModal
          wishlistTitle={wishlists.deleteWishlistTarget.title}
          onClose={wishlists.closeDeleteWishlistModal}
          onConfirm={wishlists.confirmDeleteWishlist}
          isDeleting={wishlists.isDeleteWishlistSubmitting}
          errorMessage={wishlists.deleteWishlistError}
        />
      )}
    </div>
  );
}
