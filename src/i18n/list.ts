import { t } from './index';

/** "eBay", "Discogs e eBay", "Discogs, eBay e Reverb": names in a sentence, in the device language. */
export function formatList(items: readonly string[]): string {
  if (items.length <= 1) return items[0] ?? '';

  const first = items.slice(0, -1).join(t('common.list.separator'));
  return t('common.list.two', { first, last: items[items.length - 1] });
}
