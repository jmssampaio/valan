import { Redirect } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { ListRow } from '@/components/list-row';
import { Screen } from '@/components/screen';
import { SegmentedControl } from '@/components/segmented-control';
import { Tag } from '@/components/tag';
import { TextTabs } from '@/components/text-tabs';
import { Spacing } from '@/constants/theme';

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

const noAction = () => {};

export default function ComponentGalleryScreen() {
  const [itemType, setItemType] = useState<ItemType>('record');
  const [listingFilter, setListingFilter] = useState<ListingFilter>('active');

  if (!__DEV__) {
    return <Redirect href="/" />;
  }

  return (
    <Screen title="Componentes">
      <ScrollView contentContainerStyle={styles.gallery}>
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
