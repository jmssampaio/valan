import { Redirect } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { CheckRow } from '@/components/check-row';
import { ChipGrid } from '@/components/chip-grid';
import { FlowHeader } from '@/components/flow-header';
import { ItemPhoto } from '@/components/item-photo';
import { ListRow } from '@/components/list-row';
import { OfferCard } from '@/components/offer-card';
import { Notice } from '@/components/notice';
import { PhotoGrid } from '@/components/photo-grid';
import { PriceField } from '@/components/price-field';
import { Screen } from '@/components/screen';
import { ScreenMessage } from '@/components/screen-message';
import { SegmentedControl } from '@/components/segmented-control';
import { SummaryStrip } from '@/components/summary-strip';
import { SwitchRow } from '@/components/switch-row';
import { Tag } from '@/components/tag';
import { TextField } from '@/components/text-field';
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

const grades = ['M', 'NM', 'VG+', 'VG', 'G+', 'G', 'F', 'P'].map((grade) => ({
  value: grade,
  label: grade,
}));

const equipmentConditions = ['Novo', 'Como novo', 'Bom', 'Razoável', 'Para peças'].map((label) => ({
  value: label,
  label,
}));

// Flat colour squares as data URIs: stand-ins for photos that need no network or camera.
const galleryPhotos = ['%231E1A17', '%23B4460F'].map((fill) => ({
  uri: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><rect width="1" height="1" fill="${fill}"/></svg>`,
}));

type ItemType = (typeof itemTypes)[number]['value'];
type ListingFilter = (typeof listingFilters)[number]['value'];

const summaryTiles = [
  { value: '12', label: 'Ativos' },
  { value: '3', label: 'Propostas' },
  { value: '412 €', label: 'Vendido em nov.' },
];

const samplePhoto = sampleItems[0].photo;

const noAction = () => {};

const photoGridLabels = {
  onAdd: noAction,
  onPressPhoto: noAction,
  addLabel: 'Adicionar\nfoto',
  addAccessibilityLabel: 'Adicionar foto',
  photoAccessibilityLabel: (position: number) => `Foto ${position}`,
  photoAccessibilityHint: 'Toca para remover',
};

export default function ComponentGalleryScreen() {
  const [itemType, setItemType] = useState<ItemType>('record');
  const [listingFilter, setListingFilter] = useState<ListingFilter>('active');
  const [grade, setGrade] = useState<string | null>('VG+');
  const [equipmentCondition, setEquipmentCondition] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [price, setPrice] = useState('28,00');
  const [ticked, setTicked] = useState(true);
  const [description, setDescription] = useState(
    'Primeira edição. Disco com marcas ligeiras, toca sem saltos.',
  );

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

        <Section label="ItemPhoto · photo and placeholder">
          <View style={styles.inline}>
            <ItemPhoto source={samplePhoto} />
            <ItemPhoto source={null} />
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

        <Section label="PriceField">
          <PriceField
            label="Preço em EUR"
            value={price}
            onChangeText={setPrice}
            currency="EUR"
            placeholder="0,00"
          />
        </Section>

        <Section label="SwitchRow">
          <SwitchRow
            title="Aceitar propostas"
            meta="Os compradores podem propor outro preço"
            value={ticked}
            onValueChange={setTicked}
          />
        </Section>

        <Section label="CheckRow · ticked, unticked, unavailable">
          <View>
            <CheckRow
              title="Discogs"
              meta="Comissão estimada 2,52 €"
              checked={ticked}
              onChange={setTicked}
              trailing={<Tag label="Ligado" tone="success" />}
            />
            <CheckRow title="eBay" checked={false} onChange={noAction} />
            <CheckRow
              title="Discogs"
              meta="Discogs só aceita discos que existam no seu catálogo."
              checked={false}
              disabled
              onChange={noAction}
              divider="none"
            />
          </View>
        </Section>

        <Section label="Notice">
          <Notice
            tag="Só eBay"
            title="Este anúncio não vai para o Discogs"
            body="O Discogs só aceita discos que existam no seu catálogo. O anúncio é publicado no eBay com o nome que escreveste."
          />
        </Section>

        <Section label="FlowHeader">
          <FlowHeader
            step={2}
            steps={4}
            stepLabel="2/4"
            stepAccessibilityLabel="Passo 2 de 4"
            leading={{ label: '‹ Voltar', onPress: noAction }}
          />
        </Section>

        <Section label="TextField · search, labelled and multi-line">
          <TextField
            label="Procurar no catálogo"
            labelHidden
            placeholder="Título, artista ou n.º de catálogo"
            value={search}
            onChangeText={setSearch}
          />
          <TextField
            label="Nome do aparelho"
            placeholder="Marca e modelo"
            value={search}
            onChangeText={setSearch}
          />
          <TextField label="Descrição" value={description} onChangeText={setDescription} multiline />
        </Section>

        <Section label="ChipGrid · grades and words">
          <ChipGrid
            label="Estado do disco"
            options={grades}
            value={grade}
            onChange={setGrade}
            columns={4}
          />
          <ChipGrid
            label="Estado do aparelho"
            options={equipmentConditions}
            value={equipmentCondition}
            onChange={setEquipmentCondition}
            columns={3}
          />
        </Section>

        <Section label="PhotoGrid · with photos, adding, full">
          <PhotoGrid {...photoGridLabels} photos={galleryPhotos} max={8} columns={4} />
          <PhotoGrid {...photoGridLabels} photos={[]} max={8} columns={4} adding />
          <PhotoGrid {...photoGridLabels} photos={galleryPhotos} max={2} columns={4} />
        </Section>

        <Section label="Button · large">
          <Button label="Continuar" onPress={noAction} />
          <Button label="Continuar com Apple" variant="ink" onPress={noAction} />
          <Button label="Continuar com email" variant="outline" onPress={noAction} />
          <Button label="Mais tarde" variant="text" onPress={noAction} />
          <Button label="Remover" variant="danger" onPress={noAction} />
          <Button label="Publicar em 2 plataformas" disabled onPress={noAction} />
        </Section>

        <Section label="OfferCard · waiting, from outside, answered">
          <OfferCard
            title="Noites de Lisboa"
            meta="vinil_porto · eBay · Expira em 21 h"
            asking="Pedes 28 €"
            price="24 €"
            actions={[
              { label: 'Rejeitar', onPress: noAction },
              { label: 'Aceitar', onPress: noAction, primary: true },
            ]}
          />
          <OfferCard
            title="Blue Harbor Sessions"
            meta="crate_digger · Discogs"
            asking="Pedes 45 €"
            price="38 €"
            actions={[{ label: 'Responder em Discogs ↗', onPress: noAction }]}
          />
          <OfferCard
            title="Night Ferry"
            meta="north_records · eBay"
            asking="Pedes 27,50 €"
            price="25 €"
            tag={{ label: 'Aceite', tone: 'success' }}
            actions={[]}
            isLast
          />
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
