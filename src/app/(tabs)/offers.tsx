import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { OfferCard, type OfferCardAction } from '@/components/offer-card';
import { Screen } from '@/components/screen';
import { ScreenMessage } from '@/components/screen-message';
import { TextTabs } from '@/components/text-tabs';
import { Wave } from '@/components/wave';
import { Colors, Spacing } from '@/constants/theme';
import { marketplaceName } from '@/features/listing-detail/labels';
import {
  acceptConfirmation,
  actionLabel,
  cardFacts,
  offerAction,
  offerTabs,
  outcomeTag,
  splitOffers,
  type OfferTab,
} from '@/features/offers/labels';
import { useGuardedAction } from '@/hooks/use-guarded-action';
import { useIsOnline } from '@/hooks/use-is-online';
import { useOffers } from '@/hooks/use-offers';
import { usePendingOffers } from '@/hooks/use-pending-offers';
import { t } from '@/i18n';
import { openExternal } from '@/services/external-link';
import { OfferError, respondOffer, type OfferResponse, type OfferRow } from '@/services/offers';

export default function OffersScreen() {
  const isOnline = useIsOnline();
  const offers = useOffers();
  const pendingOffers = usePendingOffers();

  // Coming back from another screen shows what changed there. The first focus is the
  // screen opening, which already loads.
  const { refresh } = offers;
  const hasOpened = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (hasOpened.current) refresh();
      hasOpened.current = true;
    }, [refresh]),
  );

  const isEmpty = offers.status === 'ready' && offers.offers.length === 0;

  return (
    <Screen
      title={t('tabs.offers')}
      // The empty screen's drawing hangs well below the title; everything else sits close to it.
      titleGap={isEmpty ? 'x30' : 'x4'}>
      {offers.status === 'loading' ? (
        <View style={styles.loading}>
          <ActivityIndicator accessibilityLabel={t('offers.loading')} color={Colors.ink} />
        </View>
      ) : offers.status === 'error' ? (
        <ScreenMessage
          title={t(isOnline ? 'offers.error.title' : 'listings.offline.title')}
          body={t(isOnline ? 'listings.error.body' : 'offers.offline.body')}
          action={{ label: t('common.retry'), onPress: offers.reload }}
        />
      ) : isEmpty ? (
        <ScreenMessage
          illustration={<Wave />}
          title={t('offers.empty.title')}
          body={t('offers.empty.body')}
        />
      ) : (
        <Inbox
          rows={offers.offers}
          isOnline={isOnline}
          refreshing={offers.refreshing}
          refreshFailed={offers.refreshFailed}
          onRefresh={offers.refresh}
          onAnswered={() => {
            refresh();
            pendingOffers.reload();
          }}
        />
      )}
    </Screen>
  );
}

function Inbox({
  rows,
  isOnline,
  refreshing,
  refreshFailed,
  onRefresh,
  onAnswered,
}: {
  rows: readonly OfferRow[];
  isOnline: boolean;
  refreshing: boolean;
  refreshFailed: boolean;
  onRefresh: () => void;
  /** Loads what changed after an answer: the offers, and the count on the tab bar. */
  onAnswered: () => void;
}) {
  const router = useRouter();
  const { offer: openedOffer } = useLocalSearchParams<{ offer?: string }>();
  const { working, run } = useGuardedAction();
  const listRef = useRef<FlatList<OfferRow>>(null);

  const now = new Date();
  const { pending, answered } = splitOffers(rows, now);
  const [tab, setTab] = useState<OfferTab>('pending');
  const visible = tab === 'pending' ? pending : answered;

  // An offer named by the screen that sent the seller here is shown on the tab it belongs to
  // and brought into view. State follows the parameter as it changes, during the render, so
  // the wrong tab is never drawn first.
  const [seenOffer, setSeenOffer] = useState<string | undefined>(undefined);
  const [target, setTarget] = useState<string | null>(null);
  const openedTab: OfferTab | null = answered.some(({ offer }) => offer.id === openedOffer)
    ? 'answered'
    : pending.some(({ offer }) => offer.id === openedOffer)
      ? 'pending'
      : null;
  if (openedOffer !== seenOffer) {
    setSeenOffer(openedOffer);
    if (openedTab !== null) {
      setTab(openedTab);
      setTarget(openedOffer ?? null);
    }
  }

  // Once shown, the parameter has done its job: leave the address as the seller would expect.
  useEffect(() => {
    if (openedOffer && openedTab !== null) router.setParams({ offer: undefined });
  }, [openedOffer, openedTab, router]);

  useEffect(() => {
    if (target === null) return;
    const index = visible.findIndex(({ offer }) => offer.id === target);
    if (index > 0) listRef.current?.scrollToIndex({ index, animated: false });
  }, [target, tab, visible]);

  async function answer(row: OfferRow, response: OfferResponse) {
    const { offer } = row;
    const outcome = await run(`${response}:${offer.id}`, () =>
      respondOffer({ offerId: offer.id, response, amountMinor: offer.amount_minor }).then(() => {}),
    );

    if (outcome.status === 'done') onAnswered();
    if (outcome.status !== 'failed') return;

    Alert.alert(
      t(response === 'accept' ? 'offers.failed.accept' : 'offers.failed.reject'),
      failureBody(outcome.error),
    );
    // The seller answered from what they saw, and the server knows better: show what it knows.
    if (outcome.error instanceof OfferError && outcome.error.kind !== 'unavailable') onAnswered();
  }

  function confirmAccept(row: OfferRow) {
    const { title, body } = acceptConfirmation(row);
    Alert.alert(title, body, [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('offers.action.accept'), onPress: () => void answer(row, 'accept') },
    ]);
  }

  async function openOnMarketplace(row: OfferRow) {
    if (row.listingUrl === null) return;
    const address = row.listingUrl;
    const outcome = await run(`open:${row.offer.id}`, () => openExternal(address));
    if (outcome.status === 'failed') {
      Alert.alert(
        t('offers.failed.open', { name: marketplaceName(row.marketplace) }),
        t('listingDetail.action.failed.body'),
      );
    }
  }

  function actionsFor(row: OfferRow): OfferCardAction[] {
    const isBusy = working.some((key) => key.endsWith(`:${row.offer.id}`));
    const disabled = isBusy || !isOnline;

    switch (offerAction(row, now)) {
      case 'respond':
        return [
          {
            label: t('offers.action.reject'),
            accessibilityLabel: actionLabel('reject', row),
            disabled,
            onPress: () => void answer(row, 'reject'),
          },
          {
            label: t('offers.action.accept'),
            accessibilityLabel: actionLabel('accept', row),
            primary: true,
            disabled,
            onPress: () => confirmAccept(row),
          },
        ];
      case 'openOnMarketplace':
        return [
          {
            label: t('offers.action.openOn', { name: marketplaceName(row.marketplace) }),
            accessibilityLabel: actionLabel('openOn', row),
            disabled,
            onPress: () => void openOnMarketplace(row),
          },
        ];
      case 'expired':
      case 'none':
        return [];
    }
  }

  // Being offline explains a failed refresh, so it is the only notice shown then.
  const notice = !isOnline
    ? t('offers.offline.notice')
    : refreshFailed
      ? t('listings.refresh.failed')
      : null;

  return (
    <View style={styles.inbox}>
      {notice ? (
        <AppText variant="rowMeta" color="muted" accessibilityRole="alert" style={styles.notice}>
          {notice}
        </AppText>
      ) : null}
      <TextTabs options={offerTabs(pending.length)} value={tab} onChange={setTab} />
      <FlatList
        ref={listRef}
        testID="offers-list"
        data={visible}
        keyExtractor={({ offer }) => offer.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.ink} />
        }
        renderItem={({ item: row, index }) => {
          const facts = cardFacts(row, now);
          return (
            <OfferCard
              {...facts}
              tag={outcomeTag(row, now) ?? undefined}
              note={offerAction(row, now) === 'expired' ? t('offers.expired.note') : undefined}
              actions={actionsFor(row)}
              isLast={index === visible.length - 1}
            />
          );
        }}
        // The offers have different heights; if the one to show is not drawn yet, aim at its place.
        onScrollToIndexFailed={({ index, averageItemLength }) =>
          listRef.current?.scrollToOffset({ offset: index * averageItemLength, animated: false })
        }
        ListEmptyComponent={
          <AppText color="muted" style={styles.emptyTab}>
            {t(tab === 'pending' ? 'offers.pending.empty' : 'offers.answered.empty')}
          </AppText>
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

/** What went wrong with an answer, in words: the server's refusal, or that nothing got through. */
function failureBody(error: unknown): string {
  if (error instanceof OfferError && error.kind !== 'unavailable') {
    return t(`offers.failed.body.${error.kind}`);
  }
  return t('listingDetail.action.failed.body');
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inbox: {
    flex: 1,
  },
  notice: {
    paddingBottom: Spacing.x2,
  },
  emptyTab: {
    paddingVertical: Spacing.x6,
  },
});
