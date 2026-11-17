import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';

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
import { t } from '@/i18n';
import type { ListedItem } from '@/services/listings';

const NEW_LISTING = '/new-listing/catalogue';

export default function ListingsScreen() {
  const router = useRouter();
  const isOnline = useIsOnline();
  const listings = useListingsOverview();

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
        <ListingsOverviewContent overview={listings.overview} isOnline={isOnline} />
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
  isOnline,
}: {
  overview: ListingsOverview;
  isOnline: boolean;
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<ListingFilter>('active');

  const summary = summarise({ ...overview, now: new Date() });
  const visibleItems = itemsForFilter(overview.items, filter);

  return (
    <View style={styles.overview}>
      {isOnline ? null : (
        <AppText variant="rowMeta" color="muted" style={styles.notice}>
          {t('listings.offline.notice')}
        </AppText>
      )}
      <SummaryStrip
        tiles={[
          { value: String(summary.activeCount), label: t('listings.summary.active') },
          { value: String(summary.pendingOffers), label: t('listings.summary.offers') },
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
        data={visibleItems}
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
