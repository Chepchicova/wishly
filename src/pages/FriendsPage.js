import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import RemoveFriendConfirmModal from '../components/RemoveFriendConfirmModal';
import './ProfilePage.css';
import './FriendsPage.css';
import { resolveGiftImageUrl, resolveUserAvatarUrl } from '../utils/giftDisplay';
import {
  formatBirthdayForDisplay,
  formatCountdownToEventBadge,
  formatEventDateShort,
} from '../utils/dateFormat';

function giftsCountLabel(n) {
  const c = Number(n);
  if (!Number.isFinite(c) || c < 0) {
    return '0 подарков';
  }
  if (c === 1) {
    return '1 подарок';
  }
  const m10 = c % 10;
  const m100 = c % 100;
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) {
    return `${c} подарка`;
  }
  return `${c} подарков`;
}

function renderFriendStatus(status) {
  if (status === 'accepted') {
    return 'У вас уже в друзьях';
  }
  if (status === 'pending_incoming') {
    return 'Пользователь уже отправил вам заявку — ответьте во входящих.';
  }
  if (status === 'pending') {
    return '';
  }
  return '';
}

function FriendProfileAndWishlistsBlock({ friend, wishlists, wishlistsLoading, wishlistsEmptyMessage, friendMenu }) {
  if (!friend) {
    return null;
  }
  const avatarSrc = resolveUserAvatarUrl(friend.avatar);
  const ownerIdUser = String(friend.id_user);
  const wlTitleId = `friend-wishlists-preview-title-${String(friend.id || friend.id_user || 'u')}`;

  return (
    <>
      <article className={`friend-profile-card${friendMenu ? ' friend-profile-card--with-menu' : ''}`}>
        {friendMenu ? (
          <div className="friend-profile-menu-anchor">
            <div className="dots-menu-wrap" ref={friendMenu.menuRef}>
              <button
                type="button"
                className="dots-btn"
                aria-label="Меню друга"
                aria-expanded={friendMenu.isOpen}
                onClick={friendMenu.onToggle}
              >
                ...
              </button>
              {friendMenu.isOpen ? (
                <div className="dots-menu" role="menu">
                  <button type="button" role="menuitem" className="dots-menu-item-danger" onClick={friendMenu.onRemoveClick}>
                    Удалить из друзей
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
        <span className="friend-profile-avatar" aria-hidden>
          {avatarSrc ? <img src={avatarSrc} alt="" loading="lazy" /> : String(friend.name || '?').slice(0, 1)}
        </span>
        <div className="friend-profile-main">
          <h3>{friend.name}</h3>
          <div className="profile-id-row">
            <span className="profile-id-label">ID</span>
            <span className="profile-id-value">{friend.id_user}</span>
          </div>
          {friend.birthday ? (
            <p className="profile-birthday-line">Дата рождения: {formatBirthdayForDisplay(friend.birthday)}</p>
          ) : null}
          {friend.description_user ? (
            <p className="profile-description-line">
              <span className="profile-description-prefix">Описание:</span>{' '}
              <span className="profile-description-text">{friend.description_user}</span>
            </p>
          ) : null}
        </div>
      </article>

      <section className="friend-wishlists-block" aria-labelledby={wlTitleId}>
        <h3 id={wlTitleId} className="friend-wishlists-title">
          Списки желаний · {friend.name}
        </h3>
        {wishlistsLoading ? (
          <p className="empty-note friend-wishlists-status">Загрузка списков…</p>
        ) : !wishlists || wishlists.length === 0 ? (
          <p className="empty-note friend-wishlists-status">{wishlistsEmptyMessage}</p>
        ) : (
          <div className="friend-wishlists-grid">
            {wishlists.map((wl) => {
              const count = wl.wishes.length;
              const countLabel = giftsCountLabel(count);
              const previewGifts = wl.wishes.slice(0, 6);
              const dateShort = wl.eventDateIso ? formatEventDateShort(wl.eventDateIso) : '';
              const countdownBadge = formatCountdownToEventBadge(wl.eventDateIso);
              return (
                <article key={wl.id} className="friend-wishlist-preview-card">
                  <header className="friend-wishlist-preview-head">
                    <img
                      src={wl.icon}
                      alt=""
                      className="friend-wishlist-preview-icon wishlist-icon-png"
                      width={40}
                      height={40}
                    />
                    <div className="friend-wishlist-preview-titles">
                      <h4 className="friend-wishlist-preview-name">{wl.title}</h4>
                      <p className="friend-wishlist-preview-count">{countLabel}</p>
                    </div>
                  </header>
                  {previewGifts.length === 0 ? (
                    <div className="friend-wishlist-preview-thumbs friend-wishlist-preview-thumbs--empty">
                      <p className="friend-wishlist-preview-empty-note">Пока без пожеланий</p>
                    </div>
                  ) : (
                    <div className="friend-wishlist-preview-thumbs">
                      {previewGifts.map((w) => {
                        const gid = String(w.giftId);
                        const thumb = resolveGiftImageUrl(w.imagePath);
                        const href = `/wishlists/gifts/${encodeURIComponent(gid)}?list=${encodeURIComponent(wl.id)}&owner=${encodeURIComponent(ownerIdUser)}`;
                        return (
                          <a
                            key={w.id || gid}
                            className="friend-wishlist-preview-thumb"
                            href={href}
                            title={w.title || 'Подарок'}
                          >
                            <img src={thumb} alt="" loading="lazy" />
                          </a>
                        );
                      })}
                    </div>
                  )}
                  <a
                    href={`/friends/wishlists/${encodeURIComponent(wl.id)}?owner=${encodeURIComponent(ownerIdUser)}`}
                    className="friend-wishlist-open-detail"
                  >
                    Подробнее о списке
                  </a>
                  {dateShort || countdownBadge ? (
                    <footer className="friend-wishlist-preview-foot">
                      <span className="friend-wishlist-preview-date">{dateShort || '\u00a0'}</span>
                      {countdownBadge ? (
                        <span className="friend-wishlist-preview-badge">{countdownBadge}</span>
                      ) : (
                        <span className="friend-wishlist-preview-foot-spacer" aria-hidden />
                      )}
                    </footer>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}

export default function FriendsPage({
  currentUser,
  onOpenLogin,
  isFriendsLoading,
  friendsData = [],
  selectedFriend,
  onSelectFriend,
  friendsMessage,
  findByIdUserValue,
  onFindByIdUserValueChange,
  onFindUserByIdUser,
  isFindLoading,
  foundUser,
  onSendFriendRequest,
  isSendingRequest,
  onCancelOutgoingFriendRequest,
  isCancellingRequest = false,
  findMessage,
  incomingFriendRequests = [],
  isIncomingLoading = false,
  incomingMessage = '',
  onRespondFriendRequest,
  respondingRequestId = null,
  selectedFriendWishlists,
  isSelectedFriendWishlistsLoading,
  friendsPreviewOwnerIdUser = null,
  requestsTabPreviewProfile = null,
  requestsTabPreviewWishlists = [],
  requestsTabPreviewLoading = false,
  requestsTabPreviewError = '',
  onRemoveFriend,
  isRemovingFriend = false,
  isLightTheme = false,
}) {
  const [sidebarTab, setSidebarTab] = useState('friends');
  const [friendProfileMenuOpen, setFriendProfileMenuOpen] = useState(false);
  const [removeFriendModalOpen, setRemoveFriendModalOpen] = useState(false);
  const [removeFriendModalError, setRemoveFriendModalError] = useState('');
  const [removeFriendModalTarget, setRemoveFriendModalTarget] = useState(null);
  const friendProfileDotsMenuRef = useRef(null);
  const relationStatusText = renderFriendStatus(foundUser?.relationStatus);
  const rs = foundUser?.relationStatus;
  const canSendRequest = Boolean(
    foundUser &&
      currentUser &&
      rs !== 'accepted' &&
      rs !== 'pending' &&
      rs !== 'pending_incoming'
  );
  const incomingCount = incomingFriendRequests.length;

  useEffect(() => {
    if (friendsPreviewOwnerIdUser) {
      setSidebarTab('requests');
    }
  }, [friendsPreviewOwnerIdUser]);

  useEffect(() => {
    setFriendProfileMenuOpen(false);
    setRemoveFriendModalOpen(false);
    setRemoveFriendModalError('');
    setRemoveFriendModalTarget(null);
  }, [selectedFriend?.id]);

  useEffect(() => {
    setFriendProfileMenuOpen(false);
  }, [sidebarTab]);

  useEffect(() => {
    if (!friendProfileMenuOpen) {
      return undefined;
    }
    function handleDocumentMouseDown(event) {
      const root = friendProfileDotsMenuRef.current;
      if (!root || !root.contains(event.target)) {
        setFriendProfileMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleDocumentMouseDown);
    return () => document.removeEventListener('mousedown', handleDocumentMouseDown);
  }, [friendProfileMenuOpen]);

  return (
    <section className="friends-page">
      <div className="wishlists-head">
        <div>
          <h1 className="wishlists-title">Друзья</h1>
          <p className="wishlists-subtitle">Управляйте друзьями и заявками в друзья</p>
        </div>
        {!currentUser ? (
          <button type="button" className="action-btn primary-btn" onClick={onOpenLogin}>
            Войти
          </button>
        ) : null}
      </div>

      <div className="friends-panel glass-bar">
        <aside className="friends-sidebar">
          <div className="friends-sidebar-tabs" role="tablist" aria-label="Друзья и заявки">
            <button
              type="button"
              role="tab"
              id="friends-tab-list"
              aria-selected={sidebarTab === 'friends'}
              aria-controls="friends-tabpanel-list"
              className={`friends-sidebar-tab${sidebarTab === 'friends' ? ' is-active' : ''}`}
              onClick={() => setSidebarTab('friends')}
            >
              Мои друзья
            </button>
            <button
              type="button"
              role="tab"
              id="friends-tab-requests"
              aria-selected={sidebarTab === 'requests'}
              aria-controls="friends-tabpanel-requests"
              className={`friends-sidebar-tab${sidebarTab === 'requests' ? ' is-active' : ''}`}
              onClick={() => setSidebarTab('requests')}
            >
              <span className="friends-sidebar-tab-label">Заявки</span>
              {incomingCount > 0 ? (
                <span className="friends-sidebar-tab-badge" aria-label={`Входящих заявок: ${incomingCount}`}>
                  {incomingCount}
                </span>
              ) : null}
            </button>
          </div>

          <div
            className="friends-sidebar-panel"
            id="friends-tabpanel-list"
            role="tabpanel"
            aria-labelledby="friends-tab-list"
            hidden={sidebarTab !== 'friends'}
          >
            <div className="friends-list">
              {!currentUser ? (
                <div className="empty-note">Войдите, чтобы видеть друзей</div>
              ) : isFriendsLoading ? (
                <div className="empty-note">Загрузка...</div>
              ) : friendsData.length === 0 ? (
                <div className="empty-note">У вас пока нет друзей</div>
              ) : (
                friendsData.map((friend) => {
                  const avatarSrc = resolveUserAvatarUrl(friend.avatar);
                  return (
                    <button
                      type="button"
                      key={friend.id}
                      className={`friend-chip${selectedFriend?.id === friend.id ? ' is-selected' : ''}`}
                      onClick={() => onSelectFriend(friend.id)}
                    >
                      <span className="friend-chip-avatar" aria-hidden>
                        {avatarSrc ? <img src={avatarSrc} alt="" loading="lazy" /> : friend.name.slice(0, 1)}
                      </span>
                      <span className="chip-meta">
                        <strong>{friend.name}</strong>
                        <small>ID: {friend.id_user}</small>
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div
            className="friends-sidebar-panel friends-sidebar-panel--requests"
            id="friends-tabpanel-requests"
            role="tabpanel"
            aria-labelledby="friends-tab-requests"
            hidden={sidebarTab !== 'requests'}
          >
            {!currentUser ? (
              <div className="empty-note">Войдите, чтобы работать с заявками</div>
            ) : (
              <div className="friends-requests-stack">
                <div className="friend-add-card">
                  <h2>Поиск пользователя по ID</h2>
                  <p className="friend-add-hint">Укажите ID пользователя и при необходимости отправьте заявку в друзья.</p>
                  <div className="friend-add-controls">
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={8}
                      placeholder="Введите ID"
                      value={findByIdUserValue}
                      onChange={(event) => onFindByIdUserValueChange(event.target.value)}
                    />
                    <button
                      type="button"
                      className="action-btn primary-btn"
                      onClick={onFindUserByIdUser}
                      disabled={!currentUser || isFindLoading}
                    >
                      {isFindLoading ? 'Поиск...' : 'Найти'}
                    </button>
                  </div>
                  {foundUser ? (
                    <div className="found-user-card">
                      <a
                        href={`/friends?preview=${encodeURIComponent(String(foundUser.id_user))}`}
                        className="found-user-hit"
                        aria-label={`Открыть профиль: ${foundUser.name || 'Пользователь'}, ID ${foundUser.id_user}`}
                      >
                        <div className="found-user-main">
                          <strong>{foundUser.name}</strong>
                          <small>ID: {foundUser.id_user}</small>
                        </div>
                      </a>
                      <div className="found-user-actions">
                        {foundUser.relationStatus === 'pending' ? (
                          <button
                            type="button"
                            className="action-btn friend-found-btn-cancel-request"
                            onClick={onCancelOutgoingFriendRequest}
                            disabled={isCancellingRequest}
                          >
                            {isCancellingRequest ? '…' : 'Отменить заявку'}
                          </button>
                        ) : relationStatusText ? (
                          <p className="empty-note found-user-status">{relationStatusText}</p>
                        ) : (
                          <button
                            type="button"
                            className="action-btn primary-btn"
                            onClick={onSendFriendRequest}
                            disabled={!canSendRequest || isSendingRequest}
                          >
                            {isSendingRequest ? 'Отправка...' : 'Отправить заявку'}
                          </button>
                        )}
                      </div>
                    </div>
                  ) : null}
                  {findMessage ? <div className="empty-note friend-add-find-message">{findMessage}</div> : null}
                </div>

                <div className="friend-incoming-card">
                  <h2>Входящие заявки</h2>
                  {isIncomingLoading ? (
                    <p className="empty-note friend-incoming-status">Загрузка…</p>
                  ) : incomingFriendRequests.length === 0 ? (
                    <p className="empty-note friend-incoming-status">Нет ожидающих заявок</p>
                  ) : (
                    <ul className="friend-incoming-list">
                      {incomingFriendRequests.map((row) => {
                        const from = row.fromUser || {};
                        const avatarSrc = resolveUserAvatarUrl(from.avatar);
                        const busy = respondingRequestId === row.requestId;
                        const previewHref = `/friends?preview=${encodeURIComponent(String(from.id_user))}`;
                        const fromLabel = from.name || 'Пользователь';
                        return (
                          <li key={row.requestId} className="friend-incoming-row">
                            <a
                              href={previewHref}
                              className="friend-incoming-row-hit"
                              aria-label={`Открыть профиль: ${fromLabel}, ID ${from.id_user}`}
                            >
                              <div className="friend-incoming-user">
                                <span className="friend-incoming-avatar" aria-hidden>
                                  {avatarSrc ? (
                                    <img src={avatarSrc} alt="" loading="lazy" />
                                  ) : (
                                    String(from.name || '?').slice(0, 1)
                                  )}
                                </span>
                                <div className="friend-incoming-meta">
                                  <strong>{fromLabel}</strong>
                                  <small>ID: {from.id_user}</small>
                                </div>
                              </div>
                            </a>
                            <div className="friend-incoming-actions">
                              <button
                                type="button"
                                className="action-btn primary-btn friend-incoming-btn-accept"
                                disabled={Boolean(respondingRequestId)}
                                onClick={() =>
                                  onRespondFriendRequest && onRespondFriendRequest(row.requestId, 'accept')
                                }
                              >
                                {busy ? '…' : 'Принять'}
                              </button>
                              <button
                                type="button"
                                className="action-btn friend-incoming-btn-decline"
                                disabled={Boolean(respondingRequestId)}
                                onClick={() =>
                                  onRespondFriendRequest && onRespondFriendRequest(row.requestId, 'decline')
                                }
                              >
                                {busy ? '…' : 'Отклонить'}
                              </button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  {incomingMessage ? <p className="empty-note friend-incoming-error">{incomingMessage}</p> : null}
                </div>
              </div>
            )}
          </div>
        </aside>

        <section className="friends-content">
          {sidebarTab === 'requests' ? (
            currentUser ? (
              friendsPreviewOwnerIdUser ? (
                <>
                  {requestsTabPreviewLoading ? (
                    <p className="empty-note empty-content">Загрузка…</p>
                  ) : requestsTabPreviewError ? (
                    <p className="empty-note friends-preview-error">{requestsTabPreviewError}</p>
                  ) : requestsTabPreviewProfile ? (
                    <FriendProfileAndWishlistsBlock
                      friend={requestsTabPreviewProfile}
                      wishlists={requestsTabPreviewWishlists}
                      wishlistsLoading={false}
                      wishlistsEmptyMessage="Публичных списков нет — пользователь мог не публиковать списки или они пусты."
                    />
                  ) : null}
                </>
              ) : (
                <div className="friends-content-hint">
                  <p className="friends-content-hint-text">
                    Профиль и публичные списки открываются нажатием на карточку заявки в списке слева или на блок с
                    именем найденного пользователя после поиска. Список друзей и все доступные списки — на вкладке «Мои
                    друзья».
                  </p>
                </div>
              )
            ) : (
              <div className="empty-note empty-content">Войдите, чтобы принимать и отправлять заявки</div>
            )
          ) : null}

          {sidebarTab === 'friends' && selectedFriend ? (
            <FriendProfileAndWishlistsBlock
              friend={selectedFriend}
              wishlists={selectedFriendWishlists}
              wishlistsLoading={isSelectedFriendWishlistsLoading}
              wishlistsEmptyMessage="Нет списков, доступных вам — друг мог оставить их приватными или ещё не поделился."
              friendMenu={{
                isOpen: friendProfileMenuOpen,
                onToggle: () => setFriendProfileMenuOpen((previous) => !previous),
                menuRef: friendProfileDotsMenuRef,
                onRemoveClick: () => {
                  setFriendProfileMenuOpen(false);
                  setRemoveFriendModalError('');
                  setRemoveFriendModalTarget({
                    idUser: selectedFriend.id_user,
                    name: selectedFriend.name || `ID ${selectedFriend.id_user}`,
                  });
                  setRemoveFriendModalOpen(true);
                },
              }}
            />
          ) : sidebarTab === 'friends' ? (
            <div className="empty-note empty-content">
              {!currentUser
                ? 'Войдите, чтобы видеть друзей'
                : isFriendsLoading
                  ? 'Загрузка…'
                  : friendsData.length === 0
                    ? 'У вас пока нет друзей — отправьте заявку на вкладке «Заявки»'
                    : 'Выберите друга в списке слева'}
            </div>
          ) : null}
          {friendsMessage ? <div className="empty-note">{friendsMessage}</div> : null}

          {removeFriendModalOpen && removeFriendModalTarget
            ? createPortal(
                <RemoveFriendConfirmModal
                  friendName={removeFriendModalTarget.name}
                  isLightTheme={isLightTheme}
                  onClose={() => {
                    if (!isRemovingFriend) {
                      setRemoveFriendModalOpen(false);
                      setRemoveFriendModalError('');
                      setRemoveFriendModalTarget(null);
                    }
                  }}
                  onConfirm={async () => {
                    if (!onRemoveFriend || !removeFriendModalTarget) {
                      return;
                    }
                    setRemoveFriendModalError('');
                    const idUser = removeFriendModalTarget.idUser;
                    const result = await onRemoveFriend(idUser);
                    if (result && result.ok) {
                      setRemoveFriendModalOpen(false);
                      setRemoveFriendModalError('');
                      setRemoveFriendModalTarget(null);
                    } else {
                      setRemoveFriendModalError((result && result.error) || 'Не удалось удалить из друзей');
                    }
                  }}
                  isRemoving={isRemovingFriend}
                  errorMessage={removeFriendModalError}
                />,
                document.body
              )
            : null}
        </section>
      </div>
    </section>
  );
}
