import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { useCallback, useRef } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { ItemPhoto } from '@/components/item-photo';
import { ListRow } from '@/components/list-row';
import { MarketplaceRow } from '@/components/marketplace-row';
import { Screen } from '@/components/screen';
import { ScreenMessage } from '@/components/screen-message';
import {
  BorderWidth,
  Colors,
  MaxFontScale,
  MinFontSize,
  Spacing,
  Type,
} from '@/constants/theme';
import { formatPrice } from '@/features/listings/format';
import {
  availableActions,
  conditionLines,
  detailLine,
  listingMeta,
  listingStatusTag,
  marketplaceName,
  offerRow,
  saleLines,
  serverOnlyActions,
  type DetailAction,
} from '@/features/listing-detail/labels';
import { useGuardedAction } from '@/hooks/use-guarded-action';
import { useIsOnline } from '@/hooks/use-is-online';
import { useListingDetail } from '@/hooks/use-listing-detail';
import { t } from '@/i18n';
import {
  deleteDraft,
  type DetailListing,
  type ListingDetail,
} from '@/services/listing-detail';

const LISTINGS = '/';
const OFFERS = '/offers';
const REOPEN_DRAFT = '/new-listing/condition';
const PRICE_MINIMUM_SCALE = MinFontSize / Type.heroPrice.fontSize;

// The system's own header, in the app's colours: no title, only the way back to the list.
// It keeps the swipe-back gesture, which a drawn header would have to rebuild.
const headerOptions = {
  headerShown: true,
  headerTitle: '',
  headerBackTitle: t('tabs.listings'),
  headerShadowVisible: false,
  headerStyle: { backgroundColor: Colors.paper },
  headerTintColor: Colors.ink,
} as const;

export default function ListingDetailScreen() {
  const router = useRouter();
  const isOnline = useIsOnline();
  const params = useLocalSearchParams<{ id: string }>();
  const itemId = Array.isArray(params.id) ? params.id[0] : params.id;
  const listing = useListingDetail(itemId);

  // Coming back from another screen, such as Propostas, shows what changed there.
  // The first focus is the screen opening, which already loads.
  const { refresh } = listing;
  const hasOpened = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (hasOpened.current) refresh();
      hasOpened.current = true;
    }, [refresh]),
  );

  return (
    <>
      <Stack.Screen options={headerOptions} />
      {listing.status === 'ready' ? (
        <ReadyDetail
          detail={listing.detail}
          isOnline={isOnline}
          refreshFailed={listing.refreshFailed}
          onChanged={refresh}
        />
      ) : (
        <Screen title={t('listing.title')} titleSize="medium" titleGap="x4">
          {listing.status === 'loading' ? (
            <View style={styles.loading}>
              <ActivityIndicator accessibilityLabel={t('listingDetail.loading')} color={Colors.ink} />
            </View>
          ) : listing.status === 'notFound' ? (
            <ScreenMessage
              title={t('listingDetail.notFound.title')}
              body={t('listingDetail.notFound.body')}
              action={{ label: t('notFound.action'), onPress: () => router.dismissTo(LISTINGS) }}
            />
          ) : (
            <ScreenMessage
              title={t(isOnline ? 'listingDetail.error.title' : 'listings.offline.title')}
              body={t(isOnline ? 'listings.error.body' : 'listingDetail.offline.body')}
              action={{ label: t('common.retry'), onPress: listing.reload }}
            />
          )}
        </Screen>
      )}
    </>
  );
}

function ReadyDetail({
  detail,
  isOnline,
  refreshFailed,
  onChanged,
}: {
  detail: ListingDetail;
  isOnline: boolean;
  refreshFailed: boolean;
  onChanged: () => void;
}) {
  const router = useRouter();
  const { item, listings, offers, sale } = detail;
  const actions = availableActions(item, listings);

  const { working, run: guarded } = useGuardedAction();

  async function run(
    key: string,
    failedTitle: string,
    request: () => Promise<void>,
    afterwards: () => void,
  ) {
    const outcome = await guarded(key, request);
    if (outcome.status === 'done') afterwards();
    // Nothing changed, so the seller keeps what is on screen and may try again.
    if (outcome.status === 'failed') Alert.alert(failedTitle, t('listingDetail.action.failed.body'));
  }

  function confirm(title: string, body: string, confirmLabel: string, onConfirm: () => void) {
    Alert.alert(title, body, [
      { text: t('common.cancel'), style: 'cancel' },
      { text: confirmLabel, style: 'destructive', onPress: onConfirm },
    ]);
  }

  const leave = () => router.dismissTo(LISTINGS);

  // Pausing, resuming and removing are shown but do nothing yet (see serverOnlyActions).
  const notYet = () => {};

  const doAction: Record<DetailAction, () => void> = {
    pause: notYet,
    resume: notYet,
    remove: notYet,
    continueDraft: () =>
      router.push({ pathname: REOPEN_DRAFT, params: { draft: item.id } }),
    deleteDraft: () =>
      confirm(
        t('listingDetail.deleteDraft.title'),
        t('listingDetail.deleteDraft.body'),
        t('listingDetail.action.deleteDraft'),
        () =>
          void run(
            'delete',
            t('listingDetail.failed.deleteDraft'),
            () => deleteDraft(item.id),
            leave,
          ),
      ),
  };

  const busy = working.length > 0;
  const notice = !isOnline
    ? t('listingDetail.offline.notice')
    : refreshFailed
      ? t('listingDetail.refresh.failed')
      : null;
  const now = new Date();

  return (
    <Screen
      title={item.title}
      titleSize="medium"
      titleGap="x1"
      scroll
      header={<ItemSummary detail={detail} />}
      footer={
        actions.length > 0 ? (
          <Actions actions={actions} disabled={busy || !isOnline} onPress={(action) => doAction[action]()} />
        ) : undefined
      }>
      <View style={styles.sections}>
        <View style={styles.intro}>
          <AppText color="muted">{detailLine(item)}</AppText>
          {notice ? (
            <AppText variant="rowMeta" color="muted" accessibilityRole="alert">
              {notice}
            </AppText>
          ) : null}
        </View>

        {item.status === 'draft' ? null : sale ? (
          <Section title={t('listingDetail.section.sale')}>
            {saleLines(sale).map(({ label, value }, index, lines) => (
              <ListRow
                key={label}
                title={label}
                trailing={<AppText variant="rowPrice">{value}</AppText>}
                divider={index === lines.length - 1 ? 'none' : 'line'}
              />
            ))}
          </Section>
        ) : (
          <>
            {listings.length > 0 ? (
              <Section title={t('listingDetail.section.marketplaces')}>
                {listings.map((listing, index) => (
                  <ListingRow
                    key={listing.id}
                    listing={listing}
                    offers={offers.filter(({ listing_id }) => listing_id === listing.id).length}
                    isLast={index === listings.length - 1}
                  />
                ))}
              </Section>
            ) : null}
            {offers.length > 0 ? (
              <Section title={t('listingDetail.section.offers')}>
                {offers.map((offer, index) => {
                  const marketplace =
                    listings.find(({ id }) => id === offer.listing_id)?.marketplace ?? '';
                  const row = offerRow(offer, marketplace, now);

                  return (
                    <ListRow
                      key={offer.id}
                      title={row.title}
                      meta={row.meta}
                      leading={<AppText variant="rowPrice">{row.price}</AppText>}
                      trailing={
                        <Button
                          label={t('listingDetail.offer.view')}
                          accessibilityLabel={t('listingDetail.offer.view.label', {
                            price: row.price,
                            title: row.title,
                          })}
                          variant="outline"
                          size="small"
                          onPress={() => router.navigate({ pathname: OFFERS, params: { offer: offer.id } })}
                        />
                      }
                      divider={index === offers.length - 1 ? 'none' : 'line'}
                    />
                  );
                })}
              </Section>
            ) : null}
          </>
        )}
      </View>
    </Screen>
  );
}

/** The photo, the price and the condition: what the seller recognises the item by. */
function ItemSummary({ detail }: { detail: ListingDetail }) {
  const { item } = detail;

  return (
    <View style={styles.summary}>
      <ItemPhoto source={item.photo} />
      <View style={styles.figures}>
        {item.price_minor === null ? (
          <AppText variant="rowMeta" color="muted">
            {t('listings.item.noPrice')}
          </AppText>
        ) : (
          <AppText
            variant="heroPrice"
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={PRICE_MINIMUM_SCALE}
            maxFontSizeMultiplier={MaxFontScale.display}>
            {formatPrice(item.price_minor, item.currency)}
          </AppText>
        )}
        <View>
          {conditionLines(item).map((line) => (
            <AppText key={line} variant="caption" color="muted">
              {line}
            </AppText>
          ))}
        </View>
      </View>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View>
      <View style={styles.sectionHeading}>
        <AppText variant="caption" color="muted" accessibilityRole="header">
          {title}
        </AppText>
      </View>
      {children}
    </View>
  );
}

function ListingRow({
  listing,
  offers,
  isLast,
}: {
  listing: DetailListing;
  offers: number;
  isLast: boolean;
}) {
  const tag = listingStatusTag(listing.status) ?? undefined;
  const meta = listingMeta(listing, offers);

  return (
    <MarketplaceRow
      name={marketplaceName(listing.marketplace)}
      tag={tag}
      meta={meta}
      refusal={
        listing.status === 'error' && meta
          ? {
              reason: meta,
              // Trying again is the server's to do, and it cannot yet: shown, not available.
              retry: { label: t('common.retry'), onPress: () => {}, disabled: true },
            }
          : undefined
      }
      isLast={isLast}
    />
  );
}

function Actions({
  actions,
  disabled,
  onPress,
}: {
  actions: readonly DetailAction[];
  disabled: boolean;
  onPress: (action: DetailAction) => void;
}) {
  const isDraft = actions.includes('continueDraft');
  const buttons = actions.map((action) => (
    <View key={action} style={isDraft ? undefined : styles.action}>
      <Button
        label={t(`listingDetail.action.${action}`)}
        variant={buttonVariant[action]}
        disabled={disabled || serverOnlyActions.includes(action)}
        onPress={() => onPress(action)}
      />
    </View>
  ));

  return (
    <>
      {actions.some((action) => serverOnlyActions.includes(action)) ? (
        <AppText variant="rowMeta" color="muted">
          {t('listingDetail.action.soon')}
        </AppText>
      ) : null}
      <View style={isDraft ? undefined : styles.actionRow}>{buttons}</View>
    </>
  );
}

const buttonVariant = {
  pause: 'outline',
  resume: 'outline',
  remove: 'danger',
  continueDraft: 'primary',
  deleteDraft: 'danger',
} as const satisfies Record<DetailAction, 'outline' | 'danger' | 'primary'>;

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Above the title, so it carries the space the title would otherwise have above it.
  summary: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    gap: Spacing.x4,
    paddingBottom: Spacing.x4,
  },
  figures: {
    flexShrink: 1,
    gap: Spacing.x2,
  },
  sections: {
    gap: Spacing.x6,
  },
  intro: {
    gap: Spacing.x2,
  },
  sectionHeading: {
    paddingBottom: Spacing.x3,
    borderBottomWidth: BorderWidth.hairline,
    borderBottomColor: Colors.ink,
  },
  // The same gap as the stacked buttons of a draft: the footer has one rhythm.
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.x2,
  },
  action: {
    flex: 1,
  },
});
