import { useEffect, useRef, useState } from 'react';
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
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [isGiftMenuOpen, setIsGiftMenuOpen] = useState(false);
  const giftDotsMenuRef = useRef(null);
  const editSnapshotRef = useRef(null);

  const listQuery = contextListId ? `?list=${encodeURIComponent(String(contextListId))}` : '';

  useEffect(() => {
    setIsEditing(false);
    setIsGiftMenuOpen(false);
    editSnapshotRef.current = null;
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

  if (isEditing) {
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
              return (
                <li key={s.giftId}>
                  <a className="gift-details-sibling-card" href={`/wishlists/gifts/${s.giftId}${listQuery}`}>
                    <div className="gift-details-sibling-thumb">
                      <img src={thumbSrc} alt="" loading="lazy" />
                    </div>
                    <div className="gift-details-sibling-body">
                      <span className="gift-details-sibling-title">{s.title}</span>
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

  const mainCard = (
    <div className="profile-card create-wishlist-inner glass-bar gift-details-card">
      <header className="gift-details-head">
        <div className="gift-details-head-text">
          <h1 className="wishlists-title gift-details-title">{createGiftForm.title}</h1>
        </div>
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
                onClick={() => {
                  setIsGiftMenuOpen(false);
                  onDeleteGift();
                }}
              >
                Удалить
              </button>
            </div>
          ) : null}
        </div>
      </header>

      <div className="gift-details-body">
        <div className="gift-details-surface">
          <div className={`gift-details-hero${hasCustomGiftImage ? '' : ' gift-details-hero--placeholder'}`}>
            <img src={imageSrc} alt="" className="gift-details-hero-img" loading="lazy" />
          </div>
          <div className="gift-details-main">
            {createGiftForm.description ? (
              <p className="gift-details-description">{createGiftForm.description}</p>
            ) : null}

            {hasMeta ? (
              <div className="gift-details-meta">
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

  return <GiftDetailsChrome backHref={backHref} main={mainCard} aside={siblingAside} />;
}
