import { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  GIFT_REPORT_REASON_DEFINITIONS,
  MIN_GIFT_REPORT_DETAIL_LENGTH,
} from '../constants/giftReportReasons';
import './AuthModal.css';
import './DeleteWishlistConfirmModal.css';
import './ReportGiftModal.css';

export default function ReportGiftModal({
  giftTitle,
  isLightTheme = false,
  isSubmitting = false,
  errorMessage = '',
  onClose,
  onSubmit,
}) {
  const [reasonId, setReasonId] = useState(GIFT_REPORT_REASON_DEFINITIONS[0]?.id || '');
  const [description, setDescription] = useState('');

  const selected = GIFT_REPORT_REASON_DEFINITIONS.find((r) => r.id === reasonId);
  const needsDetails = Boolean(selected?.requiresDetails);
  const descTrim = description.trim();
  const detailsOk = !needsDetails || descTrim.length >= MIN_GIFT_REPORT_DETAIL_LENGTH;
  const canSubmit = Boolean(selected) && detailsOk && !isSubmitting;

  const titleLine =
    giftTitle && String(giftTitle).trim() ? `«${String(giftTitle).trim()}»` : 'этот подарок';

  const portalClass = `report-gift-modal-portal${isLightTheme ? ' report-gift-modal-portal--light' : ''}`;

  return createPortal(
    <div className={portalClass}>
      <div
        className="auth-modal-backdrop delete-wishlist-modal-backdrop report-gift-modal-backdrop"
        onClick={() => !isSubmitting && onClose()}
      >
        <section
          className="auth-modal delete-wishlist-modal report-gift-modal"
          onClick={(event) => event.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="report-gift-modal-title"
        >
          <button
            type="button"
            className="delete-wishlist-modal__close"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Закрыть"
          >
            ×
          </button>
          <h2 id="report-gift-modal-title" className="delete-wishlist-modal__title">
            Пожаловаться на подарок
          </h2>
          <p className="delete-wishlist-modal__text report-gift-modal__intro">
            Жалоба на {titleLine} будет рассмотрена модераторами. Укажите причину.
          </p>

          <fieldset className="report-gift-modal__reasons" disabled={isSubmitting}>
            <legend className="report-gift-modal__legend">Причина</legend>
            <ul className="report-gift-modal__reason-list">
              {GIFT_REPORT_REASON_DEFINITIONS.map((row) => (
                <li key={row.id}>
                  <label className="report-gift-modal__reason-label">
                    <input
                      type="radio"
                      name="gift-report-reason"
                      value={row.id}
                      checked={reasonId === row.id}
                      onChange={() => setReasonId(row.id)}
                    />
                    <span className="report-gift-modal__reason-text">
                      {row.label}
                      {row.requiresDetails ? (
                        <span className="report-gift-modal__reason-hint"> (нужно описание)</span>
                      ) : null}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>

          {needsDetails ? (
            <label className="report-gift-modal__details-label">
              <span className="report-gift-modal__details-caption">
                Опишите ситуацию <span className="report-gift-modal__required">*</span>
              </span>
              <textarea
                className="report-gift-modal__textarea"
                rows={4}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                disabled={isSubmitting}
                placeholder={`Не менее ${MIN_GIFT_REPORT_DETAIL_LENGTH} символов`}
                maxLength={4000}
              />
              <span className="report-gift-modal__counter" aria-live="polite">
                {descTrim.length} / мин. {MIN_GIFT_REPORT_DETAIL_LENGTH}
              </span>
            </label>
          ) : (
            <label className="report-gift-modal__details-label report-gift-modal__details-label--optional">
              <span className="report-gift-modal__details-caption">Комментарий (необязательно)</span>
              <textarea
                className="report-gift-modal__textarea"
                rows={3}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                disabled={isSubmitting}
                placeholder="Можно уточнить детали для модераторов"
                maxLength={4000}
              />
            </label>
          )}

          <div className="delete-wishlist-modal__actions">
            <button
              type="button"
              className="action-btn delete-wishlist-modal__btn-cancel"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Отмена
            </button>
            <button
              type="button"
              className="action-btn primary-btn report-gift-modal__submit"
              onClick={() => onSubmit({ reasonId, description: descTrim })}
              disabled={!canSubmit}
            >
              {isSubmitting ? 'Отправка…' : 'Отправить жалобу'}
            </button>
          </div>
          {errorMessage ? <p className="delete-wishlist-modal__error">{errorMessage}</p> : null}
        </section>
      </div>
    </div>,
    document.body
  );
}
