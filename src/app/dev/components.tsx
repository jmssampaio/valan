import { Redirect } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { ListRow } from '@/components/list-row';
import { Screen } from '@/components/screen';
import { ScreenMessage } from '@/components/screen-message';
import { SegmentedControl } from '@/components/segmented-control';
import { SummaryStrip } from '@/components/summary-strip';
import { Tag } from '@/components/tag';
import { TextTabs } from '@/components/text-tabs';
import { Thumbnail } from '@/components/thumbnail';
import { Wave } from '@/components/wave';
import { Spacing } from '@/constants/theme';
import { sampleItems } from '@/services/sample-data';

// Sample copy from docs/design/mockups, written here because this screen never ships:
// it exists to compare the base components with the mockups during development.
const itemTypes = [
  { value: 'record', label: 'Disco' },
  { value: 'equipment', label: 'Aparelho' },
] as const;

const listingFilters = [
  { value: 'active', label: 'Ativos · 12' },
  { value: 'drafts', label: 'Rascunhos · 2' },
  { value: 'sold', label: 'Vendidos' },
] as const;

type ItemType = (typeof itemTypes)[number]['value'];
type ListingFilter = (typeof listingFilters)[number]['value'];

const summaryTiles = [
  { value: '12', label: 'Ativos' },
  { value: '3', label: 'Propostas' },
  { value: '412 €', label: 'Vendido em nov.' },
];

const samplePhoto = sampleItems[0].photo;

const noAction = () => {};

export default function ComponentGalleryScreen() {
  const [itemType, setItemType] = useState<ItemType>('record');
  const [listingFilter, setListingFilter] = useState<ListingFilter>('active');

  if (!__DEV__) {
    return <Redirect href="/" />;
  }

  return (
    <Screen
      title="Componentes"
      titleAction={<Button label="Ação" size="small" variant="outline" onPress={noAction} />}>
      <ScrollView contentContainerStyle={styles.gallery}>
        <Section label="SummaryStrip">
          <SummaryStrip tiles={summaryTiles} />
        </Section>

        <Section label="Thumbnail · photo and placeholder">
          <View style={styles.inline}>
            <Thumbnail source={samplePhoto} />
            <Thumbnail source={null} />
          </View>
        </Section>

        <Section label="ListRow · listing">
          <ListRow
            title="Noites de Lisboa"
            meta="Os Marés · VG+"
            leading={<Thumbnail source={samplePhoto} />}
            trailing={<AppText variant="rowPrice">28 €</AppText>}
            divider="none"
            onPress={noAction}>
            <Tag label="Discogs" />
            <Tag label="eBay · erro" tone="error" />
          </ListRow>
        </Section>

        <Section label="Wave">
          <Wave />
        </Section>

        <Section label="ScreenMessage · with action">
          <ScreenMessage
            title="Não conseguimos carregar os anúncios"
            body="Algo correu mal do nosso lado. Tenta de novo dentro de momentos."
            action={{ label: 'Tentar de novo', onPress: noAction }}
          />
        </Section>

        <Section label="Button · large">
          <Button label="Continuar" onPress={noAction} />
          <Button label="Continuar com Apple" variant="ink" onPress={noAction} />
          <Button label="Continuar com email" variant="outline" onPress={noAction} />
          <Button label="Mais tarde" variant="text" onPress={noAction} />
          <Button label="Publicar em 2 plataformas" disabled onPress={noAction} />
        </Section>

        <Section label="Button · small">
          <View style={styles.inline}>
            <Button label="Ligar" size="small" onPress={noAction} />
            <Button label="Gerir" size="small" variant="outline" onPress={noAction} />
            <Button label="Rejeitar" size="small" variant="text" onPress={noAction} />
          </View>
        </Section>

        <Section label="SegmentedControl">
          <SegmentedControl options={itemTypes} value={itemType} onChange={setItemType} />
        </Section>

        <Section label="TextTabs">
          <TextTabs options={listingFilters} value={listingFilter} onChange={setListingFilter} />
        </Section>

        <Section label="Tag">
          <View style={styles.inline}>
            <Tag label="Discogs" />
            <Tag label="Ligado" tone="success" />
            <Tag label="eBay · erro" tone="error" />
            <Tag label="Em breve" tone="waiting" />
            <Tag label="Selecionado" tone="filled" />
          </View>
        </Section>

        <Section label="ListRow">
          <View>
            <ListRow title="Noites de Lisboa" meta="Os Marés · LP · VG+" onPress={noAction}>
              <Tag label="Discogs" />
              <Tag label="eBay · erro" tone="error" />
            </ListRow>
            <ListRow
              title="Discogs"
              meta="Comissão estimada 2,52 €"
              trailing={<Tag label="Ligado" tone="success" />}
            />
            <ListRow
              title="eBay"
              meta="Discos e aparelhos"
              divider="ink"
              trailing={<Button label="Ligar" size="small" onPress={noAction} />}
            />
            <ListRow title="Verde Mar" meta="Quarteto Atlântico · LP · VG" divider="none" />
          </View>
        </Section>
      </ScrollView>
    </Screen>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <AppText variant="caption" color="muted">
        {label}
      </AppText>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  gallery: {
    gap: Spacing.x8,
    paddingBottom: Spacing.x8,
  },
  section: {
    gap: Spacing.x3,
  },
  inline: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.x2,
  },
});
