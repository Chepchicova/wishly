import { useEffect } from 'react';
import './AppShell.css';
import './AppThemeLight.css';
import './SharedUi.css';

import AuthModal from './AuthModal';
import DeleteWishlistConfirmModal from './DeleteWishlistConfirmModal';
import SiteFooter from './SiteFooter';
import SiteHeader from './SiteHeader';
import CreateGiftPage from '../pages/CreateGiftPage';
import FriendsPage from '../pages/FriendsPage';
import FriendWishlistDetailPage from '../pages/FriendWishlistDetailPage';
import GiftsToFriendsPage from '../pages/GiftsToFriendsPage';
import GiftDetailsPage from '../pages/GiftDetailsPage';
import CreateWishlistPage from '../pages/CreateWishlistPage';
import ProfilePage from '../pages/ProfilePage';
import WishlistsPage from '../pages/WishlistsPage';
import { parseAppRoutes } from '../navigation/parseAppRoutes';
import { useAppTheme } from '../hooks/useAppTheme';
import { useAuthSession } from '../hooks/useAuthSession';
import { useGiftWishlistForms } from '../hooks/useGiftWishlistForms';
import { useProfileState } from '../hooks/useProfileState';
import { useFriendsState } from '../hooks/useFriendsState';
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
  const friends = useFriendsState(
    auth.currentUser,
    auth.clearAuthSession,
    routes.showFriendsPage,
    routes.friendsPreviewOwnerIdUser,
    routes.showGiftsToFriendsPage
  );

  const forms = useGiftWishlistForms({
    currentUser: auth.currentUser,
    clearAuthSession: auth.clearAuthSession,
    wishlistsData: wishlists.wishlistsData,
    editingWishlistId: routes.editingWishlistId,
    viewingGiftId: routes.viewingGiftId,
    browserPathname: routes.browserPathname,
    giftDetailsOwnerIdUser: routes.giftDetailsOwnerIdUser,
    refreshFriendWishlistsForOwner: friends.fetchFriendWishlistsForOwner,
  });

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

  const giftDetailsContextWishlist = (() => {
    if (!giftDetailsResolvedListId) {
      return null;
    }
    const id = String(giftDetailsResolvedListId);
    const fromOwn = wishlists.wishlistsData.find((w) => w.id === id);
    if (fromOwn) {
      return fromOwn;
    }
    const ownerFromQuery = routes.giftDetailsOwnerIdUser;
    if (!ownerFromQuery) {
      return null;
    }
    const fromFriend = friends.friendWishlistsByOwnerIdUser[ownerFromQuery];
    return Array.isArray(fromFriend) ? fromFriend.find((w) => w.id === id) : null;
  })();

  const isForeignGiftContext = Boolean(
    routes.giftDetailsOwnerIdUser &&
      auth.currentUser &&
      routes.giftDetailsOwnerIdUser !== String(auth.currentUser.id_user)
  );

  const giftDetailsSiblingGifts =
    giftDetailsContextWishlist && Array.isArray(giftDetailsContextWishlist.wishes)
      ? giftDetailsContextWishlist.wishes
          .map((wish) => {
            const rawLabel = wish.reservationLabel || null;
            const giftReserved = wish.isReserved ?? Boolean(rawLabel);
            let reservationLabel = rawLabel;
            if (isForeignGiftContext) {
              if (rawLabel === 'Исполнено' || rawLabel === 'Подарено') {
                reservationLabel = 'Исполнено';
              } else if (
                rawLabel &&
                /^забронировано/i.test(String(rawLabel).split(' ·')[0].trim())
              ) {
                reservationLabel = 'Забронировано';
              } else if (giftReserved && rawLabel !== 'Исполнено' && rawLabel !== 'Подарено') {
                reservationLabel = 'Забронировано';
              } else {
                reservationLabel = null;
              }
            }
            return {
              giftId: String(wish.giftId),
              title: wish.title || 'Без названия',
              note: wish.note || '',
              price: wish.price,
              imagePath: wish.imagePath,
              reservationLabel,
            };
          })
          .filter((row) => row.giftId !== String(routes.viewingGiftId))
      : [];

  const giftDetailsBackHref = isForeignGiftContext
    ? giftDetailsResolvedListId && routes.giftDetailsOwnerIdUser
      ? `/friends/wishlists/${encodeURIComponent(String(giftDetailsResolvedListId))}?owner=${encodeURIComponent(String(routes.giftDetailsOwnerIdUser))}`
      : '/friends'
    : giftDetailsResolvedListId
      ? `/wishlists?list=${encodeURIComponent(String(giftDetailsResolvedListId))}`
      : '/wishlists';

  const friendWlOwner = routes.friendWishlistOwnerIdUser;
  const friendWlId = routes.viewingFriendWishlistId;
  const listsForFriendDetail = friendWlOwner ? friends.friendWishlistsByOwnerIdUser[friendWlOwner] : undefined;
  const resolvedFriendWishlist =
    listsForFriendDetail && friendWlId
      ? listsForFriendDetail.find((w) => String(w.id) === String(friendWlId))
      : null;

  const friendWishlistDetailLabel =
    friendWlOwner &&
    (friends.friendsData.find((x) => String(x.id_user) === String(friendWlOwner))?.name ||
      `ID ${friendWlOwner}`);

  const friendWishlistDetailLoading = Boolean(
    auth.currentUser &&
      routes.showFriendWishlistDetailPage &&
      friendWlOwner &&
      (friends.friendWishlistsLoadingKey === friendWlOwner || listsForFriendDetail === undefined)
  );

  const friendWishlistDetailErrorKind =
    routes.showFriendWishlistDetailPage && auth.currentUser && friendWlOwner && friendWlId
      ? !friendWishlistDetailLoading &&
        Array.isArray(listsForFriendDetail) &&
        !resolvedFriendWishlist
        ? 'not-found'
        : null
      : null;

  useEffect(() => {
    if (!routes.showFriendWishlistDetailPage || !routes.friendWishlistOwnerIdUser || !auth.currentUser?.id_user) {
      return;
    }
    friends.fetchFriendWishlistsForOwner(routes.friendWishlistOwnerIdUser);
  }, [
    routes.showFriendWishlistDetailPage,
    routes.friendWishlistOwnerIdUser,
    auth.currentUser?.id_user,
    friends.fetchFriendWishlistsForOwner,
  ]);

  useEffect(() => {
    if (!routes.showGiftDetailsPage || !routes.giftDetailsOwnerIdUser || !auth.currentUser?.id_user) {
      return;
    }
    const o = routes.giftDetailsOwnerIdUser;
    if (o === String(auth.currentUser.id_user)) {
      return;
    }
    if (friends.friendWishlistsByOwnerIdUser[o] != null) {
      return;
    }
    friends.fetchFriendWishlistsForOwner(o);
  }, [
    routes.showGiftDetailsPage,
    routes.giftDetailsOwnerIdUser,
    auth.currentUser?.id_user,
    friends.friendWishlistsByOwnerIdUser,
    friends.fetchFriendWishlistsForOwner,
  ]);

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
        treatAsFriendsSection={isForeignGiftContext}
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

        {routes.showGiftsToFriendsPage && (
          <GiftsToFriendsPage
            currentUser={auth.currentUser}
            onOpenLogin={auth.openLoginModal}
            items={friends.giftsToFriends}
            isLoading={friends.isGiftsToFriendsLoading}
            message={friends.giftsToFriendsMessage}
          />
        )}

        {routes.showFriendsPage && !routes.showFriendWishlistDetailPage && (
          <FriendsPage
            currentUser={auth.currentUser}
            onOpenLogin={auth.openLoginModal}
            isFriendsLoading={friends.isFriendsLoading}
            friendsData={friends.friendsData}
            selectedFriend={friends.selectedFriend}
            onSelectFriend={friends.setSelectedFriendId}
            friendsMessage={friends.friendsMessage}
            findByIdUserValue={friends.findByIdUserValue}
            onFindByIdUserValueChange={friends.setFindByIdUserValue}
            onFindUserByIdUser={friends.findUserByIdUser}
            isFindLoading={friends.isFindLoading}
            foundUser={friends.foundUser}
            onSendFriendRequest={friends.sendFriendRequest}
            isSendingRequest={friends.isSendingRequest}
            onCancelOutgoingFriendRequest={friends.cancelOutgoingFriendRequest}
            isCancellingRequest={friends.isCancellingRequest}
            findMessage={friends.findMessage}
            incomingFriendRequests={friends.incomingFriendRequests}
            isIncomingLoading={friends.isIncomingLoading}
            incomingMessage={friends.incomingMessage}
            onRespondFriendRequest={friends.respondToFriendRequest}
            respondingRequestId={friends.respondingRequestId}
            friendsPreviewOwnerIdUser={routes.friendsPreviewOwnerIdUser}
            requestsTabPreviewProfile={friends.requestsTabPreviewProfile}
            requestsTabPreviewWishlists={friends.requestsTabPreviewWishlists}
            requestsTabPreviewLoading={friends.requestsTabPreviewLoading}
            requestsTabPreviewError={friends.requestsTabPreviewError}
            selectedFriendWishlists={friends.selectedFriendWishlists}
            isSelectedFriendWishlistsLoading={friends.isSelectedFriendWishlistsLoading}
            onRemoveFriend={friends.removeFriend}
            isRemovingFriend={friends.isRemovingFriend}
            isLightTheme={!isDarkTheme}
          />
        )}

        {routes.showFriendWishlistDetailPage && (
          <FriendWishlistDetailPage
            currentUser={auth.currentUser}
            onOpenLogin={auth.openLoginModal}
            wishlist={resolvedFriendWishlist}
            ownerIdUser={friendWlOwner}
            friendLabel={friendWishlistDetailLabel || ''}
            isLoading={friendWishlistDetailLoading}
            errorKind={!friendWlOwner ? 'no-owner' : friendWishlistDetailErrorKind}
            backHref="/friends"
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
              Boolean(giftDetailsResolvedListId) &&
              !giftDetailsContextWishlist &&
              !wishlists.isWishlistsLoading &&
              !(
                routes.giftDetailsOwnerIdUser &&
                friends.friendWishlistsLoadingKey === routes.giftDetailsOwnerIdUser
              )
            }
            siblingGifts={giftDetailsSiblingGifts}
            isWishlistsLoading={wishlists.isWishlistsLoading}
            isGiftReadOnly={isForeignGiftContext}
            giftQueryOwnerIdUser={routes.giftDetailsOwnerIdUser}
            giftReservation={forms.giftReservation}
            isGiftReserveSubmitting={forms.isGiftReserveSubmitting}
            onReserveFriendGift={forms.reserveFriendGift}
            onCancelFriendReservation={forms.cancelFriendGiftReservation}
            onSubmitGiftReport={forms.submitGiftReport}
            isGiftReportSubmitting={forms.isGiftReportSubmitting}
            isLightTheme={!isDarkTheme}
            ownerGiftStatus={forms.ownerGiftStatus}
            onToggleOwnerGiftFulfillment={forms.toggleOwnerGiftFulfillment}
            isGiftFulfilledToggling={forms.isGiftFulfilledToggling}
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
            privacyFriendsList={forms.privacyFriendsList}
            isPrivacyFriendsLoading={forms.isPrivacyFriendsLoading}
            onSetWishlistPrivacyMode={forms.setWishlistPrivacyMode}
            onToggleWishlistPrivacyFriend={forms.toggleWishlistPrivacyFriend}
            onSetWishlistReservationDisplay={forms.setWishlistReservationDisplay}
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
