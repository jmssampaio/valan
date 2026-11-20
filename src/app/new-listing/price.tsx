import { useRouter } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { CheckRow } from '@/components/check-row';
import { FlowHeader } from '@/components/flow-header';
import { PriceField } from '@/components/price-field';
import { Screen } from '@/components/screen';
import { SwitchRow } from '@/components/switch-row';
import { Tag } from '@/components/tag';
import { Colors, Spacing } from '@/constants/theme';
import { formatPrice } from '@/features/listings/format';
import { DEFAULT_CURRENCY, parsePrice } from '@/features/new-listing/draft';
import { stepHeader } from '@/features/new-listing/labels';
import {
  canPublish,
  publishOptions,
  selectedMarketplaces,
  toggledMarketplace,
  type PublishOption,
} from '@/features/new-listing/publishing';
import { useConnections } from '@/hooks/use-connections';
import { useIsOnline } from '@/hooks/use-is-online';
import { useListingDraft } from '@/hooks/use-listing-draft';
import { t } from '@/i18n';
import { supportedMarketplaces } from '@/services/marketplaces';

const STEP = 3;

export default function NewListingPriceScreen() {
  const router = useRouter();
  const isOnline = useIsOnline();
  const { draft, change, publication, publish } = useListingDraft();
  const connections = useConnections();

  const options =
    connections.status === 'ready'
      ? publishOptions(draft, supportedMarketplaces(), connections.connections)
      : [];
  const chosen = selectedMarketplaces(options);
  const hasUnreadablePrice = draft.priceText.trim() !== '' && parsePrice(draft.priceText) === null;
  const publishLabel =
    chosen.length === 0
      ? t('newListing.publish.none')
      : chosen.length === 1
        ? t('newListing.publish.one', { name: chosen[0].name })
        : t('newListing.publish.many', { count: chosen.length });

  function publishNow() {
    publish(chosen.map(({ id }) => id));
    router.push('/new-listing/result');
  }

  return (
    <Screen
      title={t('newListing.price.title')}
      titleSize="medium"
      titleGap="x6"
      scroll
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
        <>
          {isOnline ? null : (
            <AppText variant="rowMeta" color="muted" accessibilityRole="alert">
              {t('newListing.publish.offline')}
            </AppText>
          )}
          <Button
            label={publishLabel}
            // Off while a publish is on its way, so a second press cannot send it twice.
            disabled={
              !isOnline || publication.status === 'publishing' || !canPublish(draft, options)
            }
            onPress={publishNow}
          />
        </>
      }>
      <View style={styles.sections}>
        <View>
          <AppText variant="label" color="muted">
            {t('newListing.price.label')}
          </AppText>
          <PriceField
            label={t('newListing.price.spoken', { currency: DEFAULT_CURRENCY })}
            value={draft.priceText}
            onChangeText={(priceText) => change((current) => ({ ...current, priceText }))}
            currency={DEFAULT_CURRENCY}
            placeholder={t('newListing.price.placeholder')}
          />
          {hasUnreadablePrice ? (
            // Said as soon as it shows: the publish button is off because of it.
            <AppText variant="rowMeta" color="danger" accessibilityRole="alert" style={styles.hint}>
              {t('newListing.price.invalid')}
            </AppText>
          ) : null}
          <SwitchRow
            title={t('newListing.offers.title')}
            meta={t('newListing.offers.detail')}
            value={draft.acceptsOffers}
            onValueChange={(acceptsOffers) => change((current) => ({ ...current, acceptsOffers }))}
          />
        </View>
        <View>
          <AppText variant="label" color="muted">
            {t('newListing.publishOn')}
          </AppText>
          {connections.status === 'loading' ? (
            <View style={styles.note}>
              <ActivityIndicator
                accessibilityLabel={t('newListing.connections.loading')}
                color={Colors.ink}
              />
            </View>
          ) : null}
          {connections.status === 'error' ? (
            <View style={styles.note}>
              <AppText variant="rowMeta" color="muted" accessibilityRole="alert">
                {t(isOnline ? 'newListing.connections.error' : 'newListing.connections.offline')}
              </AppText>
              <Button
                label={t('common.retry')}
                variant="secondary"
                size="compact"
                onPress={connections.reload}
              />
            </View>
          ) : null}
          {options.map((option, index) => (
            <MarketplaceRow
              key={option.marketplace.id}
              option={option}
              isLast={index === options.length - 1}
              onToggle={() =>
                change((current) => toggledMarketplace(current, option.marketplace.id))
              }
            />
          ))}
          {options.length > 0 ? (
            <AppText variant="rowMeta" color="muted" style={styles.feesNote}>
              {t('newListing.fees.note')}
            </AppText>
          ) : null}
        </View>
      </View>
    </Screen>
  );
}

/** A marketplace is always shown: ticked, tickable, or off with the reason. Never hidden. */
function MarketplaceRow({
  option: { marketplace, state, reason, selected, feeMinor },
  isLast,
  onToggle,
}: {
  option: PublishOption;
  isLast: boolean;
  onToggle: () => void;
}) {
  const { name } = marketplace;
  const divider = isLast ? 'none' : 'line';

  if (state === 'excluded') {
    return (
      <CheckRow
        title={name}
        meta={reason ? t(`newListing.reach.reason.${reason}`, { name }) : undefined}
        checked={false}
        disabled
        onChange={onToggle}
        divider={divider}
      />
    );
  }

  if (state === 'notConnected') {
    return (
      <CheckRow
        title={name}
        meta={t('newListing.connection.needed', { name })}
        checked={false}
        disabled
        onChange={onToggle}
        trailing={<Tag label={t('newListing.connection.notConnected')} tone="waiting" />}
        divider={divider}
      />
    );
  }

  return (
    <CheckRow
      title={name}
      meta={
        feeMinor === null
          ? undefined
          : t('newListing.fee', { amount: formatPrice(feeMinor, DEFAULT_CURRENCY) })
      }
      checked={selected}
      onChange={onToggle}
      trailing={<Tag label={t('newListing.connection.connected')} tone="success" />}
      divider={divider}
    />
  );
}

const styles = StyleSheet.create({
  sections: {
    gap: Spacing.x6,
  },
  note: {
    alignItems: 'flex-start',
    gap: Spacing.x4,
    paddingVertical: Spacing.x4,
  },
  hint: {
    marginTop: Spacing.x2,
  },
  feesNote: {
    marginTop: Spacing.x3,
  },
});
