import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { ListRow } from '@/components/list-row';
import { Screen } from '@/components/screen';
import { ScreenMessage } from '@/components/screen-message';
import { SummaryStrip } from '@/components/summary-strip';
import { Tag } from '@/components/tag';
import { TextTabs } from '@/components/text-tabs';
import { Thumbnail } from '@/components/thumbnail';
import { Wave } from '@/components/wave';
import { Colors, Spacing } from '@/constants/theme';
import { formatMonth, formatPrice } from '@/features/listings/format';
import {
  filterOptions,
  itemDetail,
  itemsForFilter,
  listingTags,
  summarise,
  type ListingFilter,
} from '@/features/listings/listing-rows';
import { useIsOnline } from '@/hooks/use-is-online';
import { useListingsOverview, type ListingsOverview } from '@/hooks/use-listings-overview';
import { usePendingOffers } from '@/hooks/use-pending-offers';
import { useRefreshOnFocus } from '@/hooks/use-refresh-on-focus';
import { t } from '@/i18n';
import type { ListedItem } from '@/services/listings';

const NEW_LISTING = '/new-listing/catalogue';

export default function ListingsScreen() {
  const router = useRouter();
  const isOnline = useIsOnline();
  const listings = useListingsOverview();
  const offers = usePendingOffers();

  // The listings and the offers count are refreshed together, so the summary and the tab
  // badge move as one.
  const refreshListings = listings.refresh;
  const recountOffers = offers.reload;
  const refresh = useCallback(() => {
    refreshListings();
    recountOffers();
  }, [refreshListings, recountOffers]);

  // Coming back from another screen, such as the new-listing flow, shows what changed there.
  useRefreshOnFocus(refresh);

  const startListing = () => router.push(NEW_LISTING);
  const hasItems = listings.status === 'ready' && listings.overview.items.length > 0;
  const isEmpty = listings.status === 'ready' && !hasItems;

  return (
    <Screen
      title={t('tabs.listings')}
      // The empty screen's drawing hangs well below the title; everything else sits close to it.
      titleGap={isEmpty ? 'x30' : 'x4'}
      titleAction={
        hasItems ? <Button label={t('listings.new')} size="small" onPress={startListing} /> : undefined
      }>
      {listings.status === 'loading' ? (
        <View style={styles.loading}>
          <ActivityIndicator accessibilityLabel={t('listings.loading')} color={Colors.ink} />
        </View>
      ) : listings.status === 'error' ? (
        <ScreenMessage
          title={t(isOnline ? 'listings.error.title' : 'listings.offline.title')}
          body={t(isOnline ? 'listings.error.body' : 'listings.offline.body')}
          action={{ label: t('common.retry'), onPress: listings.reload }}
        />
      ) : hasItems ? (
        <ListingsOverviewContent
          overview={listings.overview}
          pendingOffers={offers.count}
          isOnline={isOnline}
          refreshing={listings.refreshing}
          refreshFailed={listings.refreshFailed}
          onRefresh={refresh}
        />
      ) : (
        <ScreenMessage
          illustration={<Wave />}
          title={t('listings.empty.title')}
          body={t('listings.empty.body')}
          action={{ label: t('listings.empty.action'), onPress: startListing }}
        />
      )}
    </Screen>
  );
}

function ListingsOverviewContent({
  overview,
  pendingOffers,
  isOnline,
  refreshing,
  refreshFailed,
  onRefresh,
}: {
  overview: ListingsOverview;
  /** Null while the count is not known. */
  pendingOffers: number | null;
  isOnline: boolean;
  refreshing: boolean;
  refreshFailed: boolean;
  onRefresh: () => void;
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<ListingFilter>('active');

  const summary = summarise({ ...overview, pendingOffers: pendingOffers ?? 0, now: new Date() });
  const visibleItems = itemsForFilter(overview.items, filter);
  // Being offline explains a failed refresh, so it is the only notice shown then.
  const notice = !isOnline
    ? t('listings.offline.notice')
    : refreshFailed
      ? t('listings.refresh.failed')
      : null;

  return (
    <View style={styles.overview}>
      {notice ? (
        <AppText variant="rowMeta" color="muted" style={styles.notice}>
          {notice}
        </AppText>
      ) : null}
      <SummaryStrip
        tiles={[
          { value: String(summary.activeCount), label: t('listings.summary.active') },
          {
            value: pendingOffers === null ? t('common.unknownValue') : String(pendingOffers),
            label: t('listings.summary.offers'),
          },
          {
            value: formatPrice(summary.soldThisMonthMinor, summary.currency),
            label: t('listings.summary.soldIn', { month: formatMonth(summary.month) }),
          },
        ]}
      />
      <View style={styles.filters}>
        <TextTabs options={filterOptions(overview.items)} value={filter} onChange={setFilter} />
      </View>
      <FlatList
        testID="listings-list"
        data={visibleItems}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.ink} />
        }
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <ListingRow
            item={item}
            isLast={index === visibleItems.length - 1}
            onPress={() => router.push({ pathname: '/listing/[id]', params: { id: item.id } })}
          />
        )}
        ListEmptyComponent={
          <AppText color="muted" style={styles.emptyFilter}>
            {t('listings.filter.empty')}
          </AppText>
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

function ListingRow({
  item,
  isLast,
  onPress,
}: {
  item: ListedItem;
  isLast: boolean;
  onPress: () => void;
}) {
  const tags = listingTags(item.listings);

  return (
    <ListRow
      title={item.title}
      meta={itemDetail(item)}
      leading={<Thumbnail source={item.photo} />}
      trailing={
        item.price_minor === null ? (
          <AppText variant="rowMeta" color="muted">
            {t('listings.item.noPrice')}
          </AppText>
        ) : (
          <AppText variant="rowPrice">{formatPrice(item.price_minor, item.currency)}</AppText>
        )
      }
      divider={isLast ? 'none' : 'line'}
      onPress={onPress}>
      {tags.length > 0
        ? tags.map(({ key, label, tone }) => <Tag key={key} label={label} tone={tone} />)
        : null}
    </ListRow>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overview: {
    flex: 1,
  },
  notice: {
    paddingBottom: Spacing.x2,
  },
  filters: {
    marginTop: Spacing.x2,
  },
  emptyFilter: {
    paddingVertical: Spacing.x6,
  },
});
