import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiUrl } from '../api/config';
import CancelReservationConfirmModal from '../components/CancelReservationConfirmModal';
import { formatGiftPrice, resolveGiftImageUrl } from '../utils/giftDisplay';
import { formatEventDateForDisplay } from '../utils/dateFormat';
import './WishlistsPage.css';
import './GiftsToFriendsPage.css';

function formatReservationDateLabel(isoOrSql) {
  if (!isoOrSql) {
    return '';
  }
  const head = String(isoOrSql).trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(head)) {
    return '';
  }
  return formatEventDateForDisplay(head);
}

function parseReservedAtMs(value) {
  if (value == null || String(value).trim() === '') {
    return null;
  }
  const t = Date.parse(String(value));
  return Number.isFinite(t) ? t : null;
}

function compareGiftIdDesc(a, b) {
  const ida = Number(a.giftId);
  const idb = Number(b.giftId);
  return (Number.isFinite(idb) ? idb : 0) - (Number.isFinite(ida) ? ida : 0);
}

function compareGiftIdAsc(a, b) {
  return -compareGiftIdDesc(a, b);
}

/** Сначала более новая дата брони; без даты — в конце. */
function compareReservationNewestFirst(a, b) {
  const ta = parseReservedAtMs(a.reservedAt);
  const tb = parseReservedAtMs(b.reservedAt);
  const sa = ta == null ? Number.NEGATIVE_INFINITY : ta;
  const sb = tb == null ? Number.NEGATIVE_INFINITY : tb;
  if (sb !== sa) {
    return sb - sa;
  }
  return compareGiftIdDesc(a, b);
}

/** Сначала более старая дата; без даты — в конце. */
function compareReservationOldestFirst(a, b) {
  const ta = parseReservedAtMs(a.reservedAt);
  const tb = parseReservedAtMs(b.reservedAt);
  const sa = ta == null ? Number.POSITIVE_INFINITY : ta;
  const sb = tb == null ? Number.POSITIVE_INFINITY : tb;
  if (sa !== sb) {
    return sa - sb;
  }
  return compareGiftIdAsc(a, b);
}

function compareTitleAsc(a, b) {
  const ca = String(a.title || '').trim().toLocaleLowerCase('ru');
  const cb = String(b.title || '').trim().toLocaleLowerCase('ru');
  const c = ca.localeCompare(cb, 'ru');
  if (c !== 0) {
    return c;
  }
  return compareGiftIdAsc(a, b);
}

function compareTitleDesc(a, b) {
  return compareTitleAsc(b, a);
}

function buildGiftToFriendHref(row) {
  const gid = encodeURIComponent(String(row.giftId || '').trim());
  const owner = encodeURIComponent(String(row.ownerIdUser));
  const p = new URLSearchParams();
  p.set('owner', owner);
  if (row.wishlistId != null && String(row.wishlistId).trim() !== '') {
    p.set('list', String(Number(row.wishlistId)));
  }
  return `/wishlists/gifts/${gid}?${p.toString()}`;
}

const FILTER_OPTIONS = [
  { value: 'all', label: 'Все' },
  { value: 'reserved', label: 'Только забронированные' },
  { value: 'fulfilled', label: 'Только исполненные' },
];

const SORT_OPTIONS = [
  { value: 'reservation_desc', label: 'По дате брони: сначала новее' },
  { value: 'reservation_asc', label: 'По дате брони: сначала старее' },
  { value: 'title_asc', label: 'По названию: А → Я' },
  { value: 'title_desc', label: 'По названию: Я → А' },
];

function GiftsToFriendsToolbarDropdown({ id, label, value, options, onChange, wide }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const onDocMouseDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocMouseDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const activeLabel = options.find((o) => o.value === value)?.label ?? '';

  return (
    <div className="gifts-to-friends-toolbar__group">
      <label className="gifts-to-friends-toolbar__label" id={`${id}-label`} htmlFor={id}>
        {label}
      </label>
      <div
        ref={rootRef}
        className={`gifts-to-friends-dropdown${wide ? ' gifts-to-friends-dropdown--wide' : ''}`}
      >
        <button
          type="button"
          id={id}
          className="gifts-to-friends-dropdown__trigger"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-controls={open ? `${id}-list` : undefined}
          onClick={() => setOpen((o) => !o)}
        >
          <span className="gifts-to-friends-dropdown__value">{activeLabel}</span>
          <span className="gifts-to-friends-dropdown__chevron" aria-hidden />
        </button>
        {open ? (
          <div
            id={`${id}-list`}
            className="gifts-to-friends-dropdown__menu"
            role="listbox"
            aria-labelledby={`${id}-label`}
          >
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={value === opt.value}
                className={`gifts-to-friends-dropdown__option${
                  value === opt.value ? ' gifts-to-friends-dropdown__option--selected' : ''
                }`}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function GiftsToFriendsPage({
  currentUser,
  onOpenLogin,
  items = [],
  isLoading = false,
  message = '',
  clearAuthSession,
  onAfterCancelReservation,
}) {
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelModalError, setCancelModalError] = useState('');
  const [isCancelSubmitting, setIsCancelSubmitting] = useState(false);
  const [filterMode, setFilterMode] = useState('all');
  const [sortMode, setSortMode] = useState('reservation_desc');

  const visibleItems = useMemo(() => {
    let list = [...(items || [])];
    if (filterMode === 'reserved') {
      list = list.filter((r) => r.rowState === 'reserved');
    } else if (filterMode === 'fulfilled') {
      list = list.filter((r) => r.rowState === 'fulfilled');
    }
    if (sortMode === 'reservation_desc') {
      list.sort(compareReservationNewestFirst);
    } else if (sortMode === 'reservation_asc') {
      list.sort(compareReservationOldestFirst);
    } else if (sortMode === 'title_asc') {
      list.sort(compareTitleAsc);
    } else if (sortMode === 'title_desc') {
      list.sort(compareTitleDesc);
    }
    return list;
  }, [items, filterMode, sortMode]);

  const handleConfirmCancelReservation = useCallback(async () => {
    if (!currentUser?.id_user || !cancelTarget?.giftId) {
      return;
    }
    const gid = String(cancelTarget.giftId).trim();
    setCancelModalError('');
    setIsCancelSubmitting(true);
    try {
      const response = await fetch(apiUrl(`/api/gifts/${currentUser.id_user}/${gid}/reserve`), {
        method: 'DELETE',
      });
      const data = await response.json().catch(() => ({}));
      if (response.status === 404 && data.error === 'Пользователь не найден') {
        if (typeof clearAuthSession === 'function') {
          clearAuthSession();
        }
        setCancelTarget(null);
        return;
      }
      if (!response.ok || !data.success) {
        setCancelModalError(data.error || 'Не удалось снять бронь');
        return;
      }
      const ownerIdUser = cancelTarget.ownerIdUser;
      setCancelTarget(null);
      if (typeof onAfterCancelReservation === 'function') {
        await onAfterCancelReservation(ownerIdUser);
      }
    } catch {
      setCancelModalError('Сервер недоступен');
    } finally {
      setIsCancelSubmitting(false);
    }
  }, [cancelTarget, clearAuthSession, currentUser?.id_user, onAfterCancelReservation]);

  return (
    <section className="gifts-to-friends-page">
      <div className="wishlists-head">
        <div>
          <h1 className="wishlists-title">Подарки друзьям</h1>
          <p className="wishlists-subtitle">Отклики на желания друзей: в процессе и уже исполненные.</p>
        </div>
        {!currentUser ? (
          <button type="button" className="action-btn primary-btn" onClick={onOpenLogin}>
            Войти
          </button>
        ) : null}
      </div>

      <div className="gifts-to-friends-panel glass-bar">
        {!currentUser ? (
          <p className="empty-note gifts-to-friends-empty">Войдите, чтобы увидеть список.</p>
        ) : isLoading ? (
          <p className="empty-note gifts-to-friends-status">Загрузка…</p>
        ) : items.length === 0 ? (
          <p className="empty-note gifts-to-friends-empty">
            Пока пусто. Забронируйте подарок в списке желаний друга — он появится здесь. Когда друг получит подарок или
            сам уберёт желание из «активных», строка останется с отметкой «Исполнено», чтобы вы ничего не забыли.
          </p>
        ) : (
          <>
            <div className="gifts-to-friends-toolbar" aria-label="Фильтр и сортировка списка">
              <GiftsToFriendsToolbarDropdown
                id="gifts-to-friends-filter"
                label="Показать"
                value={filterMode}
                onChange={setFilterMode}
                options={FILTER_OPTIONS}
              />
              <GiftsToFriendsToolbarDropdown
                id="gifts-to-friends-sort"
                label="Сортировка"
                value={sortMode}
                onChange={setSortMode}
                options={SORT_OPTIONS}
                wide
              />
            </div>
            {visibleItems.length === 0 ? (
              <p className="empty-note gifts-to-friends-empty gifts-to-friends-filter-empty">
                По выбранному фильтру ничего не найдено. Попробуйте «Все» или другой вариант.
              </p>
            ) : (
              <ul className="gifts-to-friends-list">
                {visibleItems.map((row) => {
                  const href = buildGiftToFriendHref(row);
                  const thumb = resolveGiftImageUrl(row.imagePath);
                  const price = formatGiftPrice(row.price);
                  const reservedDay = formatReservationDateLabel(row.reservedAt);
                  const wishlistTitle = typeof row.wishlistTitle === 'string' ? row.wishlistTitle.trim() : '';
                  const wishlistEventLabel = row.wishlistDateEvent
                    ? formatEventDateForDisplay(row.wishlistDateEvent)
                    : '';
                  const friendDisplay = row.ownerName
                    ? String(row.ownerName).trim()
                    : `id ${row.ownerIdUser}`;
                  const canCancelReservation = row.rowState !== 'fulfilled';
                  return (
                    <li key={row.giftId} className="gifts-to-friends-item">
                      <div className="gifts-to-friends-card">
                        <a href={href} className="gifts-to-friends-row">
                          <span className="gifts-to-friends-thumb" aria-hidden>
                            <img src={thumb} alt="" loading="lazy" />
                          </span>
                          <span className="gifts-to-friends-body">
                            <span className="gifts-to-friends-title">{row.title || 'Подарок'}</span>
                            <div className="gifts-to-friends-details">
                              <div className="gifts-to-friends-detail-row">
                                <span className="gifts-to-friends-detail-label">Друг</span>
                                <span className="gifts-to-friends-detail-value">{friendDisplay}</span>
                              </div>
                              {wishlistTitle ? (
                                <div className="gifts-to-friends-detail-row">
                                  <span className="gifts-to-friends-detail-label">Список</span>
                                  <span className="gifts-to-friends-detail-value">{wishlistTitle}</span>
                                </div>
                              ) : null}
                              {price ? (
                                <div className="gifts-to-friends-detail-row">
                                  <span className="gifts-to-friends-detail-label">Цена</span>
                                  <span className="gifts-to-friends-detail-value">{price}</span>
                                </div>
                              ) : null}
                              {wishlistEventLabel ? (
                                <div className="gifts-to-friends-detail-row">
                                  <span className="gifts-to-friends-detail-label">Дата события</span>
                                  <span className="gifts-to-friends-detail-value">{wishlistEventLabel}</span>
                                </div>
                              ) : null}
                              {reservedDay ? (
                                <div className="gifts-to-friends-detail-row">
                                  <span className="gifts-to-friends-detail-label">Дата брони</span>
                                  <span className="gifts-to-friends-detail-value">{reservedDay}</span>
                                </div>
                              ) : null}
                            </div>
                          </span>
                        </a>
                        <div className="gifts-to-friends-card-trail">
                          <span
                            className={`gifts-to-friends-pill${
                              row.rowState === 'fulfilled' ? ' gifts-to-friends-pill--fulfilled' : ''
                            }`}
                          >
                            {row.stateLabel}
                          </span>
                          {canCancelReservation ? (
                            <button
                              type="button"
                              className="action-btn primary-btn gifts-to-friends-cancel-btn"
                              disabled={isCancelSubmitting}
                              onClick={() => {
                                setCancelModalError('');
                                setCancelTarget({
                                  giftId: String(row.giftId),
                                  ownerIdUser: row.ownerIdUser,
                                });
                              }}
                            >
                              Отменить бронь
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
        {message ? <p className="empty-note gifts-to-friends-error">{message}</p> : null}
      </div>

      {cancelTarget ? (
        <CancelReservationConfirmModal
          onClose={() => !isCancelSubmitting && setCancelTarget(null)}
          onConfirm={handleConfirmCancelReservation}
          isSubmitting={isCancelSubmitting}
          errorMessage={cancelModalError}
        />
      ) : null}
    </section>
  );
}
