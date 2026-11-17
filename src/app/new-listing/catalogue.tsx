import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { FlowHeader } from '@/components/flow-header';
import { ListRow } from '@/components/list-row';
import { Screen } from '@/components/screen';
import { SegmentedControl } from '@/components/segmented-control';
import { Tag } from '@/components/tag';
import { TextField } from '@/components/text-field';
import { BorderWidth, Colors, Spacing } from '@/constants/theme';
import { canLeaveCatalogue, withType } from '@/features/new-listing/draft';
import { releaseDetail, releaseLabel, stepHeader } from '@/features/new-listing/labels';
import { useCatalogueSearch, type CatalogueSearch } from '@/hooks/use-catalogue-search';
import { useIsOnline } from '@/hooks/use-is-online';
import { useListingDraft } from '@/hooks/use-listing-draft';
import { t } from '@/i18n';
import type { CatalogueRelease } from '@/services/catalogue';

export default function NewListingCatalogueScreen() {
  const router = useRouter();
  const isOnline = useIsOnline();
  const { draft, change } = useListingDraft();
  const [query, setQuery] = useState('');
  const isRecord = draft.type === 'record';
  const search = useCatalogueSearch(isRecord ? query : '');

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
        <Button
          label={t('common.continue')}
          disabled={!canLeaveCatalogue(draft)}
          onPress={() => router.push('/new-listing/condition')}
        />
      }>
      <View>
        <View style={styles.choice}>
          <SegmentedControl
            label={t('newListing.type.label')}
            options={[
              { value: 'record', label: t('newListing.type.record') },
              { value: 'equipment', label: t('newListing.type.equipment') },
            ]}
            value={draft.type}
            onChange={(type) => change((current) => withType(current, type))}
          />
          {isRecord ? (
            <TextField
              label={t('newListing.search.label')}
              labelHidden
              placeholder={t('newListing.search.placeholder')}
              value={query}
              onChangeText={setQuery}
              autoCorrect={false}
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
          ) : (
            // Equipment has no catalogue: its name is all that identifies it.
            <TextField
              label={t('newListing.equipment.title.label')}
              placeholder={t('newListing.equipment.title.placeholder')}
              value={draft.title}
              onChangeText={(title) => change((current) => ({ ...current, title }))}
              autoCapitalize="words"
              returnKeyType="done"
            />
          )}
        </View>
        {isRecord ? (
          <CatalogueResults
            search={search}
            selected={draft.release}
            isOnline={isOnline}
            onSelect={(release) => change((current) => ({ ...current, release }))}
          />
        ) : null}
      </View>
    </Screen>
  );
}

function CatalogueResults({
  search,
  selected,
  isOnline,
  onSelect,
}: {
  search: CatalogueSearch & { retry: () => void };
  selected: CatalogueRelease | null;
  isOnline: boolean;
  onSelect: (release: CatalogueRelease) => void;
}) {
  // The chosen release stays in view, first, whatever is typed or found afterwards.
  const found = search.status === 'ready' ? search.releases : [];
  const releases =
    selected === null || found.some((release) => release.id === selected.id)
      ? found
      : [selected, ...found];

  return (
    <View style={styles.results}>
      <AppText variant="caption" color="muted">
        {t('newListing.results.title')}
      </AppText>
      <View style={styles.rule} />
      {releases.map((release, index) => {
        const isSelected = release.id === selected?.id;
        const label = releaseLabel(release);
        return (
          <ListRow
            key={release.id}
            title={release.title}
            meta={releaseDetail(release)}
            selected={isSelected}
            trailing={
              isSelected ? <Tag label={t('newListing.results.selected')} tone="filled" /> : undefined
            }
            divider={index === releases.length - 1 ? 'none' : 'line'}
            onPress={() => onSelect(release)}>
            {label ? (
              <AppText variant="tag" color="muted">
                {label}
              </AppText>
            ) : null}
          </ListRow>
        );
      })}
      {search.status === 'loading' ? (
        <View style={styles.note}>
          <ActivityIndicator accessibilityLabel={t('newListing.search.loading')} color={Colors.ink} />
        </View>
      ) : null}
      {search.status === 'idle' && selected === null ? (
        <AppText color="muted" style={styles.note}>
          {t('newListing.search.hint')}
        </AppText>
      ) : null}
      {search.status === 'ready' && found.length === 0 ? (
        <AppText color="muted" style={styles.note}>
          {t('newListing.results.none')}
        </AppText>
      ) : null}
      {search.status === 'error' ? (
        <View style={styles.note}>
          <AppText color="muted">
            {t(isOnline ? 'newListing.results.error' : 'newListing.results.offline')}
          </AppText>
          <Button label={t('common.retry')} variant="outline" size="small" onPress={search.retry} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  choice: {
    gap: Spacing.x3,
  },
  results: {
    marginTop: Spacing.x6,
  },
  rule: {
    marginTop: Spacing.x2,
    borderTopWidth: BorderWidth.hairline,
    borderTopColor: Colors.ink,
  },
  note: {
    gap: Spacing.x4,
    paddingVertical: Spacing.x4,
    alignItems: 'flex-start',
  },
});
