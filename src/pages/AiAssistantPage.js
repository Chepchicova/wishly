import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { AI_ASSISTANT_DEMO_SUGGESTIONS } from '../constants/aiAssistantDemoResponses';
import { AI_TAG_GROUPS } from '../constants/aiAssistantTags';
import { resolveUserAvatarUrl } from '../utils/giftDisplay';
import './WishlistsPage.css';
import './AiAssistantPage.css';

const AI_GIFT_PREFILL_TITLE_MAX = 200;
const AI_GIFT_PREFILL_DESC_MAX = 2000;

function buildCreateGiftHrefFromAiSuggestion(item) {
  const params = new URLSearchParams();
  const title = String(item.title || '').trim().slice(0, AI_GIFT_PREFILL_TITLE_MAX);
  if (title) {
    params.set('title', title);
  }
  const descParts = [];
  if (item.body) {
    descParts.push(String(item.body).trim());
  }
  if (item.detail) {
    descParts.push(String(item.detail).trim());
  }
  const description = descParts.join('\n\n').slice(0, AI_GIFT_PREFILL_DESC_MAX);
  if (description) {
    params.set('description', description);
  }
  const q = params.toString();
  return q ? `/wishlists/gifts/new?${q}` : '/wishlists/gifts/new';
}

export default function AiAssistantPage({
  currentUser,
  onOpenLogin,
  friendsData = [],
  isFriendsLoading = false,
}) {
  const [selectedTagIds, setSelectedTagIds] = useState(() => new Set());
  const [queryText, setQueryText] = useState('');
  const [forFriendInternalId, setForFriendInternalId] = useState(null);
  const [activeGroupId, setActiveGroupId] = useState(AI_TAG_GROUPS[0]?.id ?? 'povod');
  const [assistantSuggestions, setAssistantSuggestions] = useState([]);
  const assistantPickOffsetRef = useRef(0);
  const [recipientOpen, setRecipientOpen] = useState(false);
  const recipientLegendId = useId();
  const recipientListId = useId();
  const recipientTriggerId = useId();
  const recipientWrapRef = useRef(null);

  const selectedFriend = useMemo(() => {
    if (forFriendInternalId == null) {
      return null;
    }
    return friendsData.find((x) => String(x.id) === String(forFriendInternalId)) ?? null;
  }, [friendsData, forFriendInternalId]);

  useEffect(() => {
    if (isFriendsLoading) {
      setRecipientOpen(false);
    }
  }, [isFriendsLoading]);

  useEffect(() => {
    if (!currentUser) {
      setRecipientOpen(false);
      setAssistantSuggestions([]);
    }
  }, [currentUser]);

  useEffect(() => {
    if (!recipientOpen) {
      return undefined;
    }
    const onDocMouse = (e) => {
      if (recipientWrapRef.current && !recipientWrapRef.current.contains(e.target)) {
        setRecipientOpen(false);
      }
    };
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setRecipientOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocMouse);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocMouse);
      document.removeEventListener('keydown', onKey);
    };
  }, [recipientOpen]);

  useEffect(() => {
    if (forFriendInternalId == null) {
      return;
    }
    const exists = friendsData.some((x) => String(x.id) === String(forFriendInternalId));
    if (!exists && !isFriendsLoading) {
      setForFriendInternalId(null);
    }
  }, [friendsData, forFriendInternalId, isFriendsLoading]);

  const chooseRecipient = useCallback((internalId) => {
    setForFriendInternalId(internalId);
    setRecipientOpen(false);
  }, []);

  const toggleTag = useCallback((tagId) => {
    setSelectedTagIds((prev) => {
      const next = new Set(prev);
      if (next.has(tagId)) {
        next.delete(tagId);
      } else {
        next.add(tagId);
      }
      return next;
    });
  }, []);

  const clearTags = useCallback(() => {
    setSelectedTagIds(new Set());
  }, []);

  const selectedCount = selectedTagIds.size;

  const selectedSummaries = useMemo(() => {
    const out = [];
    for (const group of AI_TAG_GROUPS) {
      for (const tag of group.tags) {
        if (selectedTagIds.has(tag.id)) {
          out.push({ id: tag.id, label: tag.label });
        }
      }
    }
    return out;
  }, [selectedTagIds]);

  const activeGroup = AI_TAG_GROUPS.find((g) => g.id === activeGroupId) ?? AI_TAG_GROUPS[0];

  const handleSubmit = useCallback(() => {
    const pool = AI_ASSISTANT_DEMO_SUGGESTIONS;
    const count = 5;
    const start = assistantPickOffsetRef.current % pool.length;
    assistantPickOffsetRef.current += count;
    const next = [];
    for (let i = 0; i < count; i += 1) {
      next.push(pool[(start + i) % pool.length]);
    }
    setAssistantSuggestions(next);
  }, []);

  const selectedTriggerAvatarUrl = selectedFriend ? resolveUserAvatarUrl(selectedFriend.avatar) : null;

  return (
    <section className="ai-assistant-page">
      <div className="wishlists-head ai-assistant-head">
        <div>
          <h1 className="wishlists-title">AI-помощник</h1>
          <p className="wishlists-subtitle">Сформулируйте запрос: текст и теги по категориям.</p>
        </div>
      </div>

      <div className="ai-assistant-shell glass-bar">
        {!currentUser ? (
          <div className="ai-assistant-guest">
            <p className="empty-note">Войдите, чтобы выбрать друга и сохранять историю.</p>
            <button type="button" className="action-btn primary-btn" onClick={onOpenLogin}>
              Войти
            </button>
          </div>
        ) : null}

        <div className={`ai-assistant-form${!currentUser ? ' ai-assistant-form--muted' : ''}`}>
          <fieldset className="ai-fieldset ai-fieldset--compact" disabled={!currentUser}>
            <legend className="ai-block-heading" id={recipientLegendId}>
              Для кого
            </legend>
            <p className="ai-fieldset-hint ai-fieldset-hint--short">
              Выберите получателя из списка друзей (необязательно).
            </p>
            <div className="ai-recipient-row" ref={recipientWrapRef}>
              {isFriendsLoading ? (
                <p className="ai-recipient-status" aria-live="polite">
                  Загрузка списка друзей…
                </p>
              ) : null}
              <div
                className={`ai-recipient-dropdown${recipientOpen ? ' ai-recipient-dropdown--open' : ''}`}
              >
                <button
                  type="button"
                  id={recipientTriggerId}
                  className="ai-recipient-trigger"
                  aria-expanded={recipientOpen}
                  aria-haspopup="listbox"
                  aria-controls={recipientListId}
                  disabled={!currentUser || isFriendsLoading}
                  onClick={() => {
                    if (!isFriendsLoading) {
                      setRecipientOpen((o) => !o);
                    }
                  }}
                >
                  <span className="ai-recipient-trigger-inner">
                    {selectedFriend ? (
                      <>
                        <span className="ai-recipient-trigger-avatar" aria-hidden>
                          {selectedTriggerAvatarUrl ? (
                            <img src={selectedTriggerAvatarUrl} alt="" loading="lazy" />
                          ) : (
                            <span className="ai-recipient-trigger-avatar-fallback">
                              {String(selectedFriend.name || '?').slice(0, 1)}
                            </span>
                          )}
                        </span>
                        <span className="ai-recipient-trigger-text">
                          <span className="ai-recipient-trigger-name">
                            {selectedFriend.name || 'Без имени'}
                          </span>
                          <span className="ai-recipient-trigger-id">id {selectedFriend.id_user}</span>
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined ai-recipient-trigger-icon" aria-hidden>
                          person_off
                        </span>
                        <span className="ai-recipient-trigger-label">Не указывать</span>
                      </>
                    )}
                  </span>
                  <span className="material-symbols-outlined ai-recipient-trigger-chevron" aria-hidden>
                    expand_more
                  </span>
                </button>
                {recipientOpen && !isFriendsLoading ? (
                  <div
                    id={recipientListId}
                    className="ai-recipient-panel"
                    role="listbox"
                    aria-labelledby={recipientLegendId}
                  >
                    <button
                      type="button"
                      role="option"
                      aria-selected={forFriendInternalId == null}
                      className={`ai-recipient-option ai-recipient-option--none${
                        forFriendInternalId == null ? ' ai-recipient-option--selected' : ''
                      }`}
                      onClick={() => chooseRecipient(null)}
                    >
                      <span className="material-symbols-outlined ai-recipient-option-icon" aria-hidden>
                        person_off
                      </span>
                      <span className="ai-recipient-option-text">
                        <span className="ai-recipient-option-name">Не указывать</span>
                        <span className="ai-recipient-option-desc">Запрос без конкретного получателя</span>
                      </span>
                    </button>
                    {friendsData.length > 0 ? (
                      <>
                        <div className="ai-recipient-panel-divider" aria-hidden />
                        <p className="ai-recipient-panel-sublabel">Друзья</p>
                        {friendsData.map((friend) => {
                          const selected = String(friend.id) === String(forFriendInternalId);
                          const av = resolveUserAvatarUrl(friend.avatar);
                          const displayName = friend.name || 'Без имени';
                          return (
                            <button
                              key={friend.id}
                              type="button"
                              role="option"
                              aria-selected={selected}
                              className={`ai-recipient-option${selected ? ' ai-recipient-option--selected' : ''}`}
                              onClick={() => chooseRecipient(friend.id)}
                            >
                              <span className="ai-recipient-option-avatar" aria-hidden>
                                {av ? (
                                  <img src={av} alt="" loading="lazy" />
                                ) : (
                                  <span className="ai-recipient-option-avatar-fallback">
                                    {String(displayName).slice(0, 1)}
                                  </span>
                                )}
                              </span>
                              <span className="ai-recipient-option-text">
                                <span className="ai-recipient-option-name">{displayName}</span>
                                <span className="ai-recipient-option-id">id {friend.id_user}</span>
                              </span>
                            </button>
                          );
                        })}
                      </>
                    ) : null}
                  </div>
                ) : null}
              </div>
              {!isFriendsLoading && friendsData.length === 0 && currentUser ? (
                <p className="ai-recipient-empty-hint">
                  Пока нет друзей в списке — добавьте их в разделе «Друзья», чтобы выбрать получателя.
                </p>
              ) : null}
            </div>
          </fieldset>

          <div className="ai-tags-section">
            <span className="ai-block-heading">Теги</span>
            <div className="ai-tags-toolbar-row">
              <span className="ai-tags-meta">
                выбрано: <strong>{selectedCount}</strong>
              </span>
              {selectedCount > 0 ? (
                <button type="button" className="ai-linkish-btn" onClick={clearTags} disabled={!currentUser}>
                  Сбросить все
                </button>
              ) : null}
            </div>

            <div className="ai-selected-zone" aria-label="Выбранные теги">
              {selectedSummaries.length > 0 ? (
                <div className="ai-selected-strip">
                  {selectedSummaries.map(({ id, label }) => (
                    <button
                      key={id}
                      type="button"
                      className="ai-selected-chip"
                      onClick={() => toggleTag(id)}
                      title="Нажмите, чтобы убрать"
                    >
                      <span className="ai-selected-chip-label">{label}</span>
                      <span className="ai-selected-chip-x" aria-hidden>
                        ×
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <p className="ai-sublabel" id="ai-categories-heading">
              Категории
            </p>
            <div className="ai-cat-tabs" role="tablist" aria-labelledby="ai-categories-heading">
              {AI_TAG_GROUPS.map((group) => {
                const selectedInGroup = group.tags.filter((t) => selectedTagIds.has(t.id)).length;
                const isActive = group.id === activeGroupId;
                return (
                  <button
                    key={group.id}
                    type="button"
                    role="tab"
                    id={`ai-tab-${group.id}`}
                    aria-selected={isActive}
                    aria-controls="ai-tag-panel"
                    className={`ai-cat-tab${isActive ? ' ai-cat-tab--active' : ''}`}
                    onClick={() => setActiveGroupId(group.id)}
                  >
                    <span className="ai-cat-tab-label">{group.title}</span>
                    {selectedInGroup > 0 ? (
                      <span className="ai-cat-tab-badge" aria-hidden>
                        {selectedInGroup}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>

            <p className="ai-sublabel" id="ai-active-tags-heading">
              Теги · {activeGroup ? activeGroup.title : ''}
            </p>
            <div
              id="ai-tag-panel"
              className="ai-tag-panel"
              role="tabpanel"
              aria-labelledby="ai-active-tags-heading"
            >
              {activeGroup ? (
                <div className="ai-tag-cloud">
                  {activeGroup.tags.map((tag) => {
                    const on = selectedTagIds.has(tag.id);
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        className={`ai-tag${on ? ' ai-tag--selected' : ''}`}
                        aria-pressed={on}
                        disabled={!currentUser}
                        onClick={() => toggleTag(tag.id)}
                      >
                        {tag.label}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </div>

          <div className="ai-query-block">
            <label className="ai-block-heading" htmlFor="ai-query-text">
              Запрос своими словами
            </label>
            <textarea
              id="ai-query-text"
              className="ai-textarea"
              rows={6}
              maxLength={2000}
              placeholder="Кого поздравляем, что нельзя дарить, что уже дарили, особые пожелания…"
              value={queryText}
              onChange={(e) => setQueryText(e.target.value)}
              disabled={!currentUser}
            />
            <p className="ai-char-hint">{queryText.length} / 2000</p>
          </div>

          <div className="ai-submit-row">
            <button
              type="button"
              className="action-btn primary-btn ai-submit-btn"
              onClick={handleSubmit}
              disabled={!currentUser}
            >
              <span className="material-symbols-outlined ai-submit-icon" aria-hidden>
                auto_awesome
              </span>
              Сформировать запрос
            </button>
          </div>

          {assistantSuggestions.length > 0 ? (
            <div className="ai-demo-results" aria-label="Ответ ассистента">
              <span className="ai-block-heading ai-demo-results-heading">Подборка по вашему запросу</span>
              <ul className="ai-demo-card-list">
                {assistantSuggestions.map((item, index) => (
                  <li key={`${item.id}-${index}`} className="ai-demo-card">
                    <div className="ai-demo-card-head">
                      <span
                        className={`ai-demo-kind${item.kind === 'experience' ? ' ai-demo-kind--experience' : ''}`}
                      >
                        {item.kind === 'experience' ? 'Развлечение' : 'Подарок'}
                      </span>
                    </div>
                    <h3 className="ai-demo-card-title">{item.title}</h3>
                    <p className="ai-demo-card-body">{item.body}</p>
                    {item.detail ? <p className="ai-demo-card-detail">{item.detail}</p> : null}
                    <div className="ai-demo-card-actions">
                      <a
                        className="action-btn action-btn--inline-icon ai-demo-add-wishlist-link"
                        href={buildCreateGiftHrefFromAiSuggestion(item)}
                      >
                        <span className="material-symbols-outlined action-btn__icon" aria-hidden>
                          playlist_add
                        </span>
                        Добавить в список пожеланий
                      </a>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
