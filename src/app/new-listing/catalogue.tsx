import { useRouter } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { FlowHeader } from '@/components/flow-header';
import { ListRow } from '@/components/list-row';
import { Notice } from '@/components/notice';
import { Screen } from '@/components/screen';
import { SegmentedControl } from '@/components/segmented-control';
import { Tag } from '@/components/tag';
import { TextField } from '@/components/text-field';
import { BorderWidth, Colors, Spacing } from '@/constants/theme';
import {
  canLeaveCatalogue,
  catalogueStep,
  marketplaceReach,
  withKind,
  withName,
  withoutCatalogue,
  withRelease,
  type CatalogueSearchOutcome,
  type CatalogueStep,
  type ListingDraft,
} from '@/features/new-listing/draft';
import {
  marketplaceName,
  releaseDetail,
  releaseLabel,
  stepHeader,
} from '@/features/new-listing/labels';
import { useCatalogueSearch, type CatalogueSearch } from '@/hooks/use-catalogue-search';
import { useIsOnline } from '@/hooks/use-is-online';
import { useListingDraft } from '@/hooks/use-listing-draft';
import { t } from '@/i18n';
import type { CatalogueRelease } from '@/services/catalogue';

function outcomeOf(search: CatalogueSearch): CatalogueSearchOutcome {
  if (search.status !== 'ready') return search.status;
  return search.releases.length > 0 ? 'found' : 'none';
}

export default function NewListingCatalogueScreen() {
  const router = useRouter();
  const isOnline = useIsOnline();
  const { draft, change } = useListingDraft();
  const search = useCatalogueSearch(draft.name);
  const outcome = outcomeOf(search);
  const step = catalogueStep(draft, outcome);
  const isDecided = step.state === 'linked' || step.state === 'unlinked';

  return (
    <Screen
      title={t('newListing.catalogue.title')}
      titleSize="medium"
      titleGap="x5"
      scroll
      header={
        <FlowHeader
          {...stepHeader(1)}
          // Leaving saves the draft; see the flow's layout.
          leading={{ label: t('common.cancel'), onPress: () => router.back() }}
        />
      }
      footer={
        <>
          {isDecided ? <PublishesOn draft={draft} /> : null}
          <Button
            label={t('common.continue')}
            disabled={!canLeaveCatalogue(draft, outcome)}
            onPress={() => router.push('/new-listing/condition')}
          />
        </>
      }>
      <View style={styles.sections}>
        <TextField
          label={t('newListing.name.label')}
          labelHidden
          placeholder={t('newListing.name.placeholder')}
          value={draft.name}
          onChangeText={(name) => change((current) => withName(current, name))}
          autoCorrect={false}
          autoCapitalize="sentences"
          returnKeyType="done"
          clearButtonMode="while-editing"
        />
        <Editions
          search={search}
          step={step}
          selected={draft.release}
          isOnline={isOnline}
          onSelect={(release) => change((current) => withRelease(current, release))}
          onDecline={() => change(withoutCatalogue)}
        />
        {step.state === 'unlinked' ? (
          <>
            <Notice
              tag={t('newListing.ebayOnly.tag')}
              title={t('newListing.ebayOnly.title')}
              body={t(
                step.why === 'failed' ? 'newListing.ebayOnly.body.failed' : 'newListing.ebayOnly.body',
              )}
            />
            <View style={styles.question}>
              <AppText variant="caption" color="muted">
                {t('newListing.kind.label')}
              </AppText>
              <SegmentedControl
                label={t('newListing.kind.label')}
                options={[
                  { value: 'record', label: t('newListing.kind.record') },
                  { value: 'equipment', label: t('newListing.kind.other') },
                ]}
                value={draft.kind}
                onChange={(kind) => change((current) => withKind(current, kind))}
              />
              <AppText variant="rowMeta" color="muted">
                {t('newListing.kind.hint')}
              </AppText>
            </View>
          </>
        ) : null}
      </View>
    </Screen>
  );
}

/** The marketplaces this listing can reach, so a limit is never a surprise at the last step. */
function PublishesOn({ draft }: { draft: ListingDraft }) {
  const names = marketplaceReach(draft)
    .filter((reach) => reach.available)
    .map((reach) => marketplaceName(reach.marketplace));

  return (
    <View
      accessible
      accessibilityLabel={`${t('newListing.publishesOn')}: ${names.join(', ')}`}
      style={styles.publishesOn}>
      <AppText variant="caption" color="muted">
        {t('newListing.publishesOn')}
      </AppText>
      {names.map((name) => (
        <Tag key={name} label={name} />
      ))}
    </View>
  );
}

function Editions({
  search,
  step,
  selected,
  isOnline,
  onSelect,
  onDecline,
}: {
  search: CatalogueSearch & { retry: () => void };
  step: CatalogueStep;
  selected: CatalogueRelease | null;
  isOnline: boolean;
  onSelect: (release: CatalogueRelease) => void;
  onDecline: () => void;
}) {
  // The chosen edition stays in view, first, whatever is typed or found afterwards.
  const found = search.status === 'ready' ? search.releases : [];
  const editions =
    selected === null || found.some((release) => release.id === selected.id)
      ? found
      : [selected, ...found];
  const declined = step.state === 'unlinked' && step.why === 'declined';
  const failed = search.status === 'error';

  return (
    <View>
      <AppText variant="caption" color="muted">
        {t('newListing.catalogue.heading')}
      </AppText>
      <AppText variant="rowMeta" color="muted" style={styles.status}>
        {failed
          ? t(isOnline ? 'newListing.catalogue.error' : 'newListing.catalogue.offline')
          : search.status === 'ready' && found.length === 0
            ? t('newListing.catalogue.none')
            : t('newListing.catalogue.hint')}
      </AppText>
      {failed ? (
        <View style={styles.retry}>
          <Button label={t('common.retry')} variant="outline" size="small" onPress={search.retry} />
        </View>
      ) : null}
      {search.status === 'loading' ? (
        <View style={styles.searching}>
          <ActivityIndicator
            accessibilityLabel={t('newListing.catalogue.loading')}
            color={Colors.ink}
          />
        </View>
      ) : null}
      {editions.length > 0 ? (
        <View style={styles.editions}>
          {editions.map((release) => {
            const isSelected = release.id === selected?.id;
            const label = releaseLabel(release);
            return (
              <ListRow
                key={release.id}
                title={release.title}
                meta={releaseDetail(release)}
                selected={isSelected}
                trailing={
                  isSelected ? (
                    <Tag label={t('newListing.catalogue.selected')} tone="filled" />
                  ) : undefined
                }
                onPress={() => onSelect(release)}>
                {label ? (
                  <AppText variant="tag" color="muted">
                    {label}
                  </AppText>
                ) : null}
              </ListRow>
            );
          })}
          <ListRow
            title={t('newListing.catalogue.decline')}
            selected={declined}
            trailing={
              declined ? (
                <Tag label={t('newListing.catalogue.selected')} tone="filled" />
              ) : (
                <AppText variant="option" color="muted">
                  {t('newListing.catalogue.decline.detail')}
                </AppText>
              )
            }
            divider="none"
            onPress={onDecline}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  sections: {
    gap: Spacing.x6,
  },
  status: {
    marginTop: Spacing.x1,
  },
  retry: {
    alignItems: 'flex-start',
    marginTop: Spacing.x3,
  },
  searching: {
    alignItems: 'flex-start',
    paddingVertical: Spacing.x4,
  },
  editions: {
    marginTop: Spacing.x3,
    borderTopWidth: BorderWidth.hairline,
    borderTopColor: Colors.ink,
  },
  question: {
    gap: Spacing.x2,
  },
  publishesOn: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.x2,
  },
});
