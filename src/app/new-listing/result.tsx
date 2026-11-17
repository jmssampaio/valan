import { Redirect, useRouter } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { FlowHeader } from '@/components/flow-header';
import { ListRow } from '@/components/list-row';
import { Screen } from '@/components/screen';
import { Tag } from '@/components/tag';
import { Thumbnail } from '@/components/thumbnail';
import { Colors, Spacing } from '@/constants/theme';
import { formatPrice } from '@/features/listings/format';
import { itemDetail } from '@/features/listings/listing-rows';
import { draftItemFields, type ListingDraft } from '@/features/new-listing/draft';
import { stepHeader } from '@/features/new-listing/labels';
import { publishSummary } from '@/features/new-listing/publishing';
import { useIsOnline } from '@/hooks/use-is-online';
import { useListingDraft } from '@/hooks/use-listing-draft';
import { t } from '@/i18n';
import { supportedMarketplaces } from '@/services/marketplaces';
import type { ListingOutcome, PublishResult } from '@/services/publishing';

const STEP = 4;
// How long publishing may take before the seller is told there is no need to wait.
const SLOW_AFTER_MS = 30_000;
const CATALOGUE = '/new-listing/catalogue';

function nameOf(marketplaceId: string): string {
  return supportedMarketplaces().find(({ id }) => id === marketplaceId)?.name ?? marketplaceId;
}

function resultTitle(listings: readonly ListingOutcome[]): string {
  const { published, total } = publishSummary(listings);
  if (total !== 1) return t('newListing.result.title.many', { published, total });

  const name = nameOf(listings[0].marketplace);
  return t(published === 1 ? 'newListing.result.title.one' : 'newListing.result.title.oneFailed', {
    name,
  });
}

export default function NewListingResultScreen() {
  const router = useRouter();
  const isOnline = useIsOnline();
  const { draft, publication, publish, retry, startOver } = useListingDraft();

  // Nothing was sent: this screen has nothing to show, so the flow starts where it should.
  if (publication.status === 'idle') {
    return <Redirect href={CATALOGUE} />;
  }

  if (publication.status === 'publishing') {
    return <Publishing />;
  }

  if (publication.status === 'failed') {
    const { marketplaces } = publication;
    return (
      <Screen
        title={t('newListing.result.failed.title')}
        titleSize="medium"
        titleGap="x4"
        header={
          <FlowHeader
            {...stepHeader(STEP)}
            leading={{
              label: t('common.back'),
              accessibilityLabel: t('common.back.spoken'),
              onPress: () => router.back(),
            }}
          />
        }
        footer={
          <Button
            label={t('common.retry')}
            // The message above already says there is no connection and what to do.
            disabled={!isOnline}
            onPress={() => publish(marketplaces)}
          />
        }>
        <AppText color="muted" accessibilityRole="alert">
          {t(isOnline ? 'newListing.result.failed.body' : 'newListing.result.failed.offline')}
        </AppText>
      </Screen>
    );
  }

  const { result, retrying } = publication;

  function createAnother() {
    startOver();
    router.dismissTo(CATALOGUE);
  }

  return (
    <Screen
      title={resultTitle(result.listings)}
      titleSize="medium"
      titleGap="x3"
      scroll
      header={<FlowHeader {...stepHeader(STEP)} />}
      footer={
        <>
          <Button
            label={t('newListing.result.view')}
            onPress={() => router.replace({ pathname: '/listing/[id]', params: { id: result.itemId } })}
          />
          <Button label={t('newListing.result.another')} variant="outline" onPress={createAnother} />
        </>
      }>
      {/* The listing is out: there is no step to go back to. */}
      <Stack.Screen options={{ gestureEnabled: false }} />
      <View>
        <PublishedItem draft={draft} />
        {result.listings.map((outcome, index) => (
          <OutcomeRow
            key={outcome.marketplace}
            outcome={outcome}
            isRetrying={retrying.includes(outcome.marketplace)}
            isOnline={isOnline}
            isLast={index === result.listings.length - 1}
            onRetry={() => retry(outcome.marketplace)}
          />
        ))}
      </View>
    </Screen>
  );

}

/** What was sent, as it will read in the seller's list. */
function PublishedItem({ draft }: { draft: ListingDraft }) {
  const item = draftItemFields(draft);

  return (
    <ListRow
      title={item.title}
      meta={itemDetail(item)}
      leading={<Thumbnail source={draft.photos[0] ?? null} />}
      trailing={
        item.price_minor === null ? undefined : (
          <AppText variant="rowPrice">{formatPrice(item.price_minor, item.currency)}</AppText>
        )
      }
      divider="ink"
    />
  );
}

function OutcomeRow({
  outcome,
  isRetrying,
  isOnline,
  isLast,
  onRetry,
}: {
  outcome: PublishResult['listings'][number];
  isRetrying: boolean;
  isOnline: boolean;
  isLast: boolean;
  onRetry: () => void;
}) {
  const name = nameOf(outcome.marketplace);
  const divider = isLast ? 'none' : 'line';

  if (outcome.status === 'published') {
    return (
      <ListRow
        title={name}
        meta={t('newListing.result.published.detail')}
        trailing={<Tag label={t('newListing.result.published')} tone="success" />}
        divider={divider}
      />
    );
  }

  return (
    <ListRow
      title={name}
      trailing={
        isRetrying ? (
          <Tag label={t('newListing.result.retrying')} tone="waiting" />
        ) : (
          <Tag label={t('newListing.result.error')} tone="error" />
        )
      }
      divider={divider}>
      <View style={styles.problem}>
        <AppText variant="rowMeta" color="error" accessibilityRole="alert">
          {t(`newListing.result.reason.${outcome.reason}`, { name })}
        </AppText>
        <View style={styles.actions}>
          <Button
            label={t('common.retry')}
            variant="outline"
            size="small"
            disabled={isRetrying || !isOnline}
            onPress={onRetry}
          />
        </View>
        {isOnline ? null : (
          <AppText variant="rowMeta" color="muted" accessibilityRole="alert">
            {t('newListing.result.offline')}
          </AppText>
        )}
      </View>
    </ListRow>
  );
}

const styles = StyleSheet.create({
  working: {
    alignItems: 'flex-start',
    gap: Spacing.x4,
  },
  problem: {
    flex: 1,
    gap: Spacing.x3,
  },
  actions: {
    flexDirection: 'row',
  },
});

/**
 * Publishing is the server's work: the seller may leave at any time, and each marketplace
 * shows as "publishing" in the listings until it answers.
 */
function Publishing() {
  const router = useRouter();
  const [isSlow, setIsSlow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsSlow(true), SLOW_AFTER_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Screen
      title={t('newListing.result.publishing')}
      titleSize="medium"
      titleGap="x6"
      header={
        <FlowHeader
          {...stepHeader(STEP)}
          leading={{ label: t('common.close'), onPress: () => router.dismissTo('/') }}
        />
      }>
      {/* Swiping back would land on a publish button that is already at work. */}
      <Stack.Screen options={{ gestureEnabled: false }} />
      <View style={styles.working}>
        <ActivityIndicator accessibilityLabel={t('newListing.result.publishing')} color={Colors.ink} />
        {isSlow ? (
          <AppText color="muted" accessibilityRole="alert">
            {t('newListing.result.slow', { tab: t('tabs.listings') })}
          </AppText>
        ) : null}
      </View>
    </Screen>
  );
}
