/** Причины жалобы на подарок (синхронизируйте с server/routes.js — GIFT_REPORT_REASON_DEFINITIONS). */
export const GIFT_REPORT_REASON_DEFINITIONS = [
  { id: 'spam', label: 'Спам или реклама', requiresDetails: false },
  {
    id: 'inappropriate',
    label: 'Оскорбительное или неприемлемое содержание',
    requiresDetails: true,
  },
  { id: 'fraud', label: 'Мошенничество или недопустимые ссылки', requiresDetails: true },
  { id: 'misleading', label: 'Вводящая в заблуждение информация', requiresDetails: true },
  { id: 'other', label: 'Другое', requiresDetails: true },
];

export const MIN_GIFT_REPORT_DETAIL_LENGTH = 12;
