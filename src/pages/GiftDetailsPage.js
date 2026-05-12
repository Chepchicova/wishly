import { useEffect, useRef, useState } from 'react';
import CancelReservationConfirmModal from '../components/CancelReservationConfirmModal';
import DeleteGiftConfirmModal from '../components/DeleteGiftConfirmModal';
import ReportGiftModal from '../components/ReportGiftModal';
import CreateGiftPage from './CreateGiftPage';
import { formatGiftLinkLabel, formatGiftPrice, resolveGiftImageUrl } from '../utils/giftDisplay';
import './GiftDetailsPage.css';

function GiftDetailsChrome({ backHref, main, aside }) {
  return (
    <section className="profile-page create-wishlist-page gift-details-page">
      <nav className="gift-details-back" aria-label="Навигация по разделу">
        <a href={backHref} className="gift-details-back-link">
          ← Назад к спискам
        </a>
      </nav>
      <div className="gift-details-page-inner">
        <div className="gift-details-shell">
          <div className="gift-details-column-main">{main}</div>
          {aside}
        </div>
      </div>
    </section>
  );
}

function buildGiftDetailsPath(giftIdStr, contextListId, giftQueryOwnerIdUser) {
  const p = new URLSearchParams();
  if (contextListId) {
    p.set('list', String(contextListId));
  }
  if (giftQueryOwnerIdUser) {
    p.set('owner', String(giftQueryOwnerIdUser));
  }
  const q = p.toString();
  return `/wishlists/gifts/${giftIdStr}${q ? `?${q}` : ''}`;
}

export default function GiftDetailsPage({
  currentUser,
  onOpenLogin,
  createGiftForm,
  onCreateGiftFormChange,
  onToggleGiftWishlist,
  onGiftImageChange,
  onSubmitSaveGift,
  onDeleteGift,
  isGiftLoading,
  giftMessage,
  isCreateGiftSubmitting,
  userWishlists,
  giftWishlists,
  giftId,
  backHref = '/wishlists',
  contextListId = null,
  contextListTitle = '',
  contextListMissing = false,
  siblingGifts = [],
  isWishlistsLoading = false,
  isGiftReadOnly = false,
  giftQueryOwnerIdUser = null,
  giftReservation = null,
  isGiftReserveSubmitting = false,
  onReserveFriendGift,
  onCancelFriendReservation,
  onSubmitGiftReport,
  isGiftReportSubmitting = false,
  isLightTheme = false,
  ownerGiftStatus = null,
  onToggleOwnerGiftFulfillment,
  isGiftFulfilledToggling = false,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [isGiftMenuOpen, setIsGiftMenuOpen] = useState(false);
  const [cancelReservationModalOpen, setCancelReservationModalOpen] = useState(false);
  const [cancelReservationModalError, setCancelReservationModalError] = useState('');
  const [reportGiftModalOpen, setReportGiftModalOpen] = useState(false);
  const [reportGiftModalError, setReportGiftModalError] = useState('');
  const [deleteGiftModalOpen, setDeleteGiftModalOpen] = useState(false);
  const [deleteGiftModalError, setDeleteGiftModalError] = useState('');
  const giftDotsMenuRef = useRef(null);
  const editSnapshotRef = useRef(null);

  async function handleConfirmCancelReservation() {
    if (!onCancelFriendReservation) {
      return;
    }
    setCancelReservationModalError('');
    const result = await onCancelFriendReservation();
    if (result && result.ok) {
      setCancelReservationModalOpen(false);
    } else if (result && result.error) {
      setCancelReservationModalError(result.error);
    }
  }

  useEffect(() => {
    setIsEditing(false);
    setIsGiftMenuOpen(false);
    editSnapshotRef.current = null;
    setCancelReservationModalOpen(false);
    setCancelReservationModalError('');
    setReportGiftModalOpen(false);
    setReportGiftModalError('');
    setDeleteGiftModalOpen(false);
    setDeleteGiftModalError('');
  }, [giftId]);

  useEffect(() => {
    if (!isGiftMenuOpen) {
      return undefined;
    }
    function handleDocumentMouseDown(event) {
      const root = giftDotsMenuRef.current;
      if (root && !root.contains(event.target)) {
        setIsGiftMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleDocumentMouseDown);
    return () => document.removeEventListener('mousedown', handleDocumentMouseDown);
  }, [isGiftMenuOpen]);

  function handleStartEdit() {
    editSnapshotRef.current = JSON.stringify(createGiftForm);
    setIsGiftMenuOpen(false);
    setIsEditing(true);
  }

  function handleCancelEdit() {
    if (editSnapshotRef.current) {
      try {
        onCreateGiftFormChange(JSON.parse(editSnapshotRef.current));
      } catch {
        /* ignore */
      }
      editSnapshotRef.current = null;
    }
    setIsEditing(false);
  }

  if (isGiftLoading) {
    return (
      <GiftDetailsChrome
        backHref={backHref}
        main={
          <div className="profile-card create-wishlist-inner glass-bar gift-details-card">
            <h1 className="wishlists-title">Загрузка</h1>
            <p className="wishlists-subtitle">Подождите, загружаем данные…</p>
          </div>
        }
      />
    );
  }

  if (!currentUser) {
    return (
      <GiftDetailsChrome
        backHref="/wishlists"
        main={
          <div className="profile-card create-wishlist-inner glass-bar gift-details-card">
            <h1 className="wishlists-title">Вход</h1>
            <p className="wishlists-subtitle">Чтобы продолжить, войдите в аккаунт.</p>
            <button type="button" className="action-btn primary-btn" onClick={onOpenLogin}>
              Войти
            </button>
          </div>
        }
      />
    );
  }

  const loadFailed = Boolean(giftMessage) && !String(createGiftForm.title || '').trim();

  if (loadFailed) {
    return (
      <GiftDetailsChrome
        backHref={backHref}
        main={
          <div className="profile-card create-wishlist-inner glass-bar gift-details-card">
            <h1 className="wishlists-title">Не удалось загрузить</h1>
            <p className="wishlist-create-message" role="alert">
              {giftMessage}
            </p>
          </div>
        }
      />
    );
  }

  if (isEditing && !isGiftReadOnly) {
    return (
      <>
        <section className="profile-page create-wishlist-page gift-details-page">
          <nav className="gift-details-back" aria-label="Навигация по разделу">
            <a href={backHref} className="gift-details-back-link">
              ← Назад к спискам
            </a>
          </nav>
        </section>
        <CreateGiftPage
          currentUser={currentUser}
          onOpenLogin={onOpenLogin}
          createGiftForm={createGiftForm}
          onCreateGiftFormChange={onCreateGiftFormChange}
          onToggleGiftWishlist={onToggleGiftWishlist}
          onSubmitCreateGift={onSubmitSaveGift}
          createGiftMessage={giftMessage}
          isCreateGiftSubmitting={isCreateGiftSubmitting}
          userWishlists={userWishlists}
          onGiftImageChange={onGiftImageChange}
          pageTitle="Редактировать подарок"
          pageSubtitle="Измените данные и нажмите «Сохранить изменения»"
          submitLabel="Сохранить изменения"
          guestMessage="Чтобы редактировать подарок, войдите в аккаунт."
          onCancel={handleCancelEdit}
          cancelHref={backHref}
        />
      </>
    );
  }

  const listsLine = giftWishlists.length
    ? giftWishlists.map((w) => w.title).join(', ')
    : 'не указано';
  const imageSrc = resolveGiftImageUrl(createGiftForm.imageDataUrl || createGiftForm.imagePath);
  const hasCustomGiftImage = Boolean(createGiftForm.imageDataUrl || createGiftForm.imagePath);
  const priceLabel = formatGiftPrice(createGiftForm.price);
  const urlTrimmed = String(createGiftForm.url || '').trim();
  const linkLabel = urlTrimmed ? formatGiftLinkLabel(urlTrimmed) : '';
  const linkHref = urlTrimmed.match(/^https?:\/\//i) ? urlTrimmed : urlTrimmed ? `https://${urlTrimmed}` : '';
  const hasMeta = Boolean(priceLabel || linkHref);

  const showSiblingColumn = Boolean(contextListId);

  let siblingAside = null;
  if (showSiblingColumn) {
    const asideTitle = contextListTitle
      ? `В списке «${contextListTitle}»`
      : 'В списке';

    siblingAside = (
      <aside className="gift-details-siblings" aria-label="Подарки из выбранного списка">
        <h2 className="gift-details-siblings-heading">{asideTitle}</h2>
        {isWishlistsLoading ? (
          <p className="gift-details-siblings-hint">Загрузка списка…</p>
        ) : contextListMissing ? (
          <p className="gift-details-siblings-hint">Список не найден или недоступен.</p>
        ) : siblingGifts.length > 0 ? (
          <ul className="gift-details-siblings-list">
            {siblingGifts.map((s) => {
              const thumbSrc = resolveGiftImageUrl(s.imagePath);
              const sPrice = formatGiftPrice(s.price);
              const sHref = buildGiftDetailsPath(s.giftId, contextListId, giftQueryOwnerIdUser);
              return (
                <li key={s.giftId}>
                  <a className="gift-details-sibling-card" href={sHref}>
                    <div className="gift-details-sibling-thumb">
                      <img src={thumbSrc} alt="" loading="lazy" />
                    </div>
                    <div className="gift-details-sibling-body">
                      <span className="gift-details-sibling-title">{s.title}</span>
                      {s.reservationLabel ? (
                        <span className="gift-details-sibling-reserved">{s.reservationLabel}</span>
                      ) : null}
                      {sPrice ? <span className="gift-details-sibling-price">{sPrice}</span> : null}
                    </div>
                  </a>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="gift-details-siblings-hint">Других подарков в этом списке нет.</p>
        )}
      </aside>
    );
  }

  const res = giftReservation;
  const reserveStatus = res && typeof res.status === 'string' ? res.status : '';
  const showFriendReserve = Boolean(isGiftReadOnly && !loadFailed);
  const mainCard = (
    <div className="profile-card create-wishlist-inner glass-bar gift-details-card">
      <header className="gift-details-head">
        <div className="gift-details-head-text">
          <h1 className="wishlists-title gift-details-title">{createGiftForm.title}</h1>
        </div>
        {!isGiftReadOnly ? (
          <div className="dots-menu-wrap" ref={giftDotsMenuRef}>
            <button
              type="button"
              className="dots-btn"
              aria-label="Действия с подарком"
              aria-expanded={isGiftMenuOpen}
              onClick={() => setIsGiftMenuOpen((open) => !open)}
            >
              ...
            </button>
            {isGiftMenuOpen ? (
              <div className="dots-menu" role="menu">
                <button type="button" role="menuitem" onClick={handleStartEdit}>
                  Редактировать
                </button>
                <button
                  type="button"
                  role="menuitem"
                  disabled={
                    isGiftFulfilledToggling || ownerGiftStatus == null || isCreateGiftSubmitting
                  }
                  onClick={() => {
                    if (onToggleOwnerGiftFulfillment) {
                      void onToggleOwnerGiftFulfillment();
                    }
                  }}
                >
                  {(ownerGiftStatus ?? 'free') === 'gifted'
                    ? '✗ Желание не исполнено'
                    : '✓ Желание исполнено'}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setIsGiftMenuOpen(false);
                    setDeleteGiftModalError('');
                    setDeleteGiftModalOpen(true);
                  }}
                >
                  Удалить
                </button>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="dots-menu-wrap" ref={giftDotsMenuRef}>
            <button
              type="button"
              className="dots-btn"
              aria-label="Действия"
              aria-expanded={isGiftMenuOpen}
              onClick={() => setIsGiftMenuOpen((open) => !open)}
            >
              ...
            </button>
            {isGiftMenuOpen ? (
              <div className="dots-menu" role="menu">
                <button
                  type="button"
                  role="menuitem"
                  className="dots-menu-item-danger"
                  onClick={() => {
                    setIsGiftMenuOpen(false);
                    setReportGiftModalError('');
                    setReportGiftModalOpen(true);
                  }}
                >
                  Пожаловаться
                </button>
              </div>
            ) : null}
          </div>
        )}
      </header>

      <div className="gift-details-body">
        <div className="gift-details-surface">
          <div className={`gift-details-hero${hasCustomGiftImage ? '' : ' gift-details-hero--placeholder'}`}>
            <img src={imageSrc} alt="" className="gift-details-hero-img" loading="lazy" />
          </div>
          <div className="gift-details-main">
            <div
              className={`gift-details-main-grow${hasMeta ? ' gift-details-main-grow--fill' : ''}`}
            >
              {createGiftForm.description ? (
                <p className="gift-details-description">{createGiftForm.description}</p>
              ) : null}
            </div>

            {hasMeta ? (
              <div className="gift-details-meta gift-details-meta--footer">
                {priceLabel ? <span className="gift-details-price">{priceLabel}</span> : null}
                {linkHref ? (
                  <a
                    className="gift-details-link-out"
                    href={linkHref}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span className="gift-details-link-out-label">{linkLabel}</span>
                    <span className="gift-details-link-out-hint" aria-hidden>
                      ↗
                    </span>
                  </a>
                ) : null}
              </div>
            ) : null}

            <div className="gift-details-lists-wrap">
              <span className="gift-details-lists-label">В списках</span>
              <p className="gift-details-lists">{listsLine}</p>
            </div>

            {showFriendReserve ? (
              <div className="gift-details-reserve-block">
                {!res ? (
                  <p className="gift-details-reserve-hint" role="status">
                    Не удалось получить статус бронирования. Откройте подарок по ссылке с параметром{' '}
                    <strong>?owner=…</strong> (ID друга-владельца).
                  </p>
                ) : null}
                {res && reserveStatus === 'gifted' ? (
                  <p
                    className="gift-details-reserve-notice gift-details-reserve-notice--fulfilled"
                    role="status"
                  >
                    Друг уже закрыл это желание в своём списке — подарок состоялся. Спасибо, если вы к этому
                    причастны.
                  </p>
                ) : null}
                {res && reserveStatus !== 'gifted' && res.reservedByMe ? (
                  <button
                    type="button"
                    className="action-btn primary-btn gift-details-reserve-btn gift-details-reserve-btn--cancel"
                    onClick={() => {
                      setCancelReservationModalError('');
                      setCancelReservationModalOpen(true);
                    }}
                    disabled={isGiftReserveSubmitting}
                  >
                    Отменить бронь
                  </button>
                ) : null}
                {res && reserveStatus !== 'gifted' && res.isReserved && !res.reservedByMe ? (
                  <p className="gift-details-reserve-taken">Этот подарок уже забронирован другим пользователем.</p>
                ) : null}
                {res && reserveStatus !== 'gifted' && res.canReserve ? (
                  <button
                    type="button"
                    className="action-btn primary-btn gift-details-reserve-btn"
                    onClick={() => onReserveFriendGift && onReserveFriendGift()}
                    disabled={isGiftReserveSubmitting || !res.canReserve}
                  >
                    {isGiftReserveSubmitting ? 'Бронирование…' : 'Забронировать подарок'}
                  </button>
                ) : null}
                {res &&
                reserveStatus !== 'gifted' &&
                !res.canReserve &&
                !res.isReserved &&
                !res.reservedByMe ? (
                  <p className="gift-details-reserve-hint">Бронирование сейчас недоступно.</p>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        {giftMessage ? (
          <p className="wishlist-create-message" role="status">
            {giftMessage}
          </p>
        ) : null}
      </div>
    </div>
  );

  return (
    <>
      <GiftDetailsChrome backHref={backHref} main={mainCard} aside={siblingAside} />
      {cancelReservationModalOpen ? (
        <CancelReservationConfirmModal
          onClose={() => !isGiftReserveSubmitting && setCancelReservationModalOpen(false)}
          onConfirm={handleConfirmCancelReservation}
          isSubmitting={isGiftReserveSubmitting}
          errorMessage={cancelReservationModalError}
        />
      ) : null}
      {reportGiftModalOpen ? (
        <ReportGiftModal
          giftTitle={createGiftForm.title}
          isLightTheme={isLightTheme}
          isSubmitting={isGiftReportSubmitting}
          errorMessage={reportGiftModalError}
          onClose={() => !isGiftReportSubmitting && setReportGiftModalOpen(false)}
          onSubmit={async ({ reasonId, description }) => {
            if (!onSubmitGiftReport) {
              return;
            }
            setReportGiftModalError('');
            const result = await onSubmitGiftReport({
              reasonId,
              description,
              contextWishlistId: contextListId,
            });
            if (result && result.ok) {
              setReportGiftModalOpen(false);
            } else if (result && result.error) {
              setReportGiftModalError(result.error);
            }
          }}
        />
      ) : null}
      {deleteGiftModalOpen ? (
        <DeleteGiftConfirmModal
          giftTitle={createGiftForm.title}
          onClose={() => !isCreateGiftSubmitting && setDeleteGiftModalOpen(false)}
          onConfirm={async () => {
            if (!onDeleteGift) {
              return;
            }
            setDeleteGiftModalError('');
            const result = await onDeleteGift(true);
            if (result && result.ok === false && result.error) {
              setDeleteGiftModalError(result.error);
            } else if (result && result.ok) {
              setDeleteGiftModalOpen(false);
            }
          }}
          isDeleting={isCreateGiftSubmitting}
          errorMessage={deleteGiftModalError}
        />
      ) : null}
    </>
  );
}
