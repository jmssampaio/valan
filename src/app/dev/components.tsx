import { Redirect } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { BackLink } from '@/components/back-link';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { ChipRow } from '@/components/chip-row';
import { CheckRow } from '@/components/check-row';
import { ChipGrid } from '@/components/chip-grid';
import { FlowHeader } from '@/components/flow-header';
import { Icon } from '@/components/icon';
import { ItemPhoto } from '@/components/item-photo';
import { ListRow } from '@/components/list-row';
import { Logo } from '@/components/logo';
import { OfferCard } from '@/components/offer-card';
import { Notice } from '@/components/notice';
import { PhotoGrid } from '@/components/photo-grid';
import { PlatformChip, type ChipState } from '@/components/platform-chip';
import { PriceField } from '@/components/price-field';
import { Screen } from '@/components/screen';
import { ScreenMessage } from '@/components/screen-message';
import { ScreenTitle } from '@/components/screen-title';
import { SectionLabel } from '@/components/section-label';
import { SegmentedControl } from '@/components/segmented-control';
import { SkeletonRows } from '@/components/skeleton-rows';
import { SummaryStrip } from '@/components/summary-strip';
import { SwitchRow } from '@/components/switch-row';
import { Tag } from '@/components/tag';
import { TextField } from '@/components/text-field';
import { TextTabs } from '@/components/text-tabs';
import { Thumbnail } from '@/components/thumbnail';
import { Wave } from '@/components/wave';
import { WaveLine } from '@/components/wave-line';
import { Spacing } from '@/constants/theme';
import samplePhoto from '../../../assets/samples/sleeve-1.svg';

// Sample copy from docs/design/v3, written here because this screen never ships: it exists to
// compare the base components with the design during development.
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

const noAction = () => {};

const chipStates: readonly ChipState[] = ['live', 'pending', 'paused', 'error', 'sold', 'off'];

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
      titleAction={<Button label="Ação" size="compact" variant="secondary" onPress={noAction} />}>
      <ScrollView contentContainerStyle={styles.gallery}>
        <AppText variant="label">Base do design v3</AppText>

        <Section label="Logo">
          <Logo />
        </Section>

        <Section label="ScreenTitle · large, medium, small">
          <ScreenTitle>Anúncios</ScreenTitle>
          <ScreenTitle size="medium">O que vais vender?</ScreenTitle>
          <ScreenTitle size="small">Ainda não tens anúncios</ScreenTitle>
        </Section>

        <Section label="SectionLabel">
          <SectionLabel>Plataformas ligadas</SectionLabel>
        </Section>

        <Section label="PlatformChip · every state">
          <View style={styles.inline}>
            {chipStates.map((state) => (
              <PlatformChip key={state} name="Discogs" state={state} />
            ))}
          </View>
        </Section>

        <Section label="ChipRow">
          <ChipRow
            items={[
              { key: 'discogs', name: 'Discogs', state: 'live' },
              { key: 'ebay', name: 'eBay', state: 'error' },
            ]}
          />
        </Section>

        <Section label="Card · rows divided by a line">
          <Card>
            {[
              ['Discogs', 'Ligada como joao_discos'],
              ['eBay', 'Ligada como joao.vinil'],
            ].map(([name, account]) => (
              <View key={name} style={styles.cardRow}>
                <AppText variant="rowTitle">{name}</AppText>
                <AppText variant="rowMeta" color="muted">
                  {account}
                </AppText>
              </View>
            ))}
          </Card>
          <Card padding="x4">
            <AppText variant="label" color="muted">
              Recebes em novembro
            </AppText>
            <AppText variant="bigNumber">412,40 €</AppText>
          </Card>
        </Section>

        <Section label="Button · default">
          <Button label="Continuar" onPress={noAction} />
          <Button label="Novo anúncio" icon="plus" onPress={noAction} />
          <Button label="Continuar com Apple" variant="dark" onPress={noAction} />
          <Button label="Continuar com email" variant="secondary" onPress={noAction} />
          <Button label="Publicar em 2 plataformas" loading onPress={noAction} />
          <Button label="Publicar em 2 plataformas" disabled onPress={noAction} />
          <Button label="Criar outro anúncio" variant="link" onPress={noAction} />
          <Button label="Remover anúncio" variant="dangerLink" onPress={noAction} />
        </Section>

        <Section label="Button · compact">
          <View style={styles.inline}>
            <Button label="Ligar" size="compact" onPress={noAction} />
            <Button label="Tentar de novo" size="compact" variant="secondary" onPress={noAction} />
            <Button label="Abrir" size="compact" variant="link" icon="arrow.up.right" onPress={noAction} />
          </View>
        </Section>

        <Section label="SegmentedControl">
          <SegmentedControl options={itemTypes} value={itemType} onChange={setItemType} />
        </Section>

        <Section label="FlowHeader">
          <FlowHeader
            step={2}
            steps={4}
            stepLabel="Passo 2 de 4 · Estado e fotos"
            stepAccessibilityLabel="Passo 2 de 4 · Estado e fotos"
            leading={{ label: '‹ Voltar', accessibilityLabel: 'Voltar', onPress: noAction }}
          />
        </Section>

        <Section label="ScreenMessage · empty or failed">
          <ScreenMessage
            title="Ainda não tens anúncios"
            body="Escolhe o artigo, define o estado e o preço, e publica nas tuas plataformas de uma só vez."
            action={{ label: 'Criar o primeiro anúncio', onPress: noAction }}
          />
        </Section>

        <Section label="SkeletonRows · loading">
          <SkeletonRows accessibilityLabel="A carregar os anúncios" />
        </Section>

        <Section label="WaveLine">
          <WaveLine width={60} />
        </Section>

        <Section label="Thumbnail · photo and placeholder">
          <View style={styles.inline}>
            <Thumbnail source={samplePhoto} />
            <Thumbnail source={null} />
          </View>
        </Section>

        <Section label="Icon · SF Symbols, drawn in the iOS app only">
          <View style={styles.inline}>
            <Icon name="tag" />
            <Icon name="bubble.left" />
            <Icon name="chart.bar" />
            <Icon name="person" />
            <Icon name="chevron.left" accessibilityLabel="Voltar" />
            <Icon name="magnifyingglass" color="muted" />
          </View>
        </Section>

        <AppText variant="label">Só os tokens mudaram; a estrutura vem com o ecrã de cada um</AppText>

        <Section label="SummaryStrip">
          <SummaryStrip tiles={summaryTiles} />
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

        <Section label="Wave · entry screen">
          <Wave />
        </Section>

        <Section label="BackLink">
          <BackLink label="‹ Voltar" accessibilityLabel="Voltar" onPress={noAction} />
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
              trailing={<Button label="Ligar" size="compact" onPress={noAction} />}
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
      <AppText variant="label" color="muted">
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
  cardRow: {
    gap: Spacing.x1,
    padding: Spacing.x4,
  },
  inline: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.x2,
  },
});
