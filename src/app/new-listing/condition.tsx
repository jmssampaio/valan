import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { ChipGrid } from '@/components/chip-grid';
import { FlowHeader } from '@/components/flow-header';
import { PhotoGrid } from '@/components/photo-grid';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { Spacing } from '@/constants/theme';
import { addPhotos, canLeaveCondition, MAX_PHOTOS, removePhoto } from '@/features/new-listing/draft';
import {
  equipmentConditionDetail,
  equipmentConditionOptions,
  gradeDetail,
  gradeOptions,
  stepHeader,
} from '@/features/new-listing/labels';
import { useListingDraft } from '@/hooks/use-listing-draft';
import { t, type TranslationKey } from '@/i18n';
import { pickPhotos, takePhoto, type PhotoPick } from '@/services/photo-picker';

const GRADE_COLUMNS = 4;
const EQUIPMENT_CONDITION_COLUMNS = 3;
const PHOTO_COLUMNS = 4;

export default function NewListingConditionScreen() {
  const router = useRouter();
  const { draft, change } = useListingDraft();
  const [addingPhoto, setAddingPhoto] = useState(false);
  const [photoProblem, setPhotoProblem] = useState<TranslationKey | null>(null);

  async function addFrom(pick: () => Promise<PhotoPick>) {
    setPhotoProblem(null);
    setAddingPhoto(true);
    try {
      const result = await pick();
      if (result.status === 'picked') change((current) => addPhotos(current, result.photos));
      if (result.status === 'denied') setPhotoProblem('newListing.photos.denied');
    } catch {
      setPhotoProblem('newListing.photos.error');
    } finally {
      setAddingPhoto(false);
    }
  }

  function choosePhotoSource() {
    const room = MAX_PHOTOS - draft.photos.length;
    Alert.alert(t('newListing.photos.add.label'), undefined, [
      { text: t('newListing.photos.source.camera'), onPress: () => void addFrom(takePhoto) },
      {
        text: t('newListing.photos.source.library'),
        onPress: () => void addFrom(() => pickPhotos(room)),
      },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  }

  function confirmRemoval(uri: string) {
    Alert.alert(t('newListing.photos.remove.title'), undefined, [
      {
        text: t('newListing.photos.remove.confirm'),
        style: 'destructive',
        onPress: () => change((current) => removePhoto(current, uri)),
      },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  }

  return (
    <Screen
      title={t('newListing.condition.title')}
      titleSize="medium"
      titleGap="x5"
      scroll
      header={
        <FlowHeader
          {...stepHeader(2)}
          leading={{ label: t('common.back'), onPress: () => router.back() }}
        />
      }
      footer={
        <Button
          label={t('common.continue')}
          disabled={!canLeaveCondition(draft)}
          onPress={() => router.push('/new-listing/price')}
        />
      }>
      <View style={styles.sections}>
        {draft.type === 'record' ? (
          <>
            <Section label={t('newListing.condition.media')}>
              <ChipGrid
                label={t('newListing.condition.media')}
                options={gradeOptions}
                value={draft.mediaCondition}
                onChange={(mediaCondition) => change((current) => ({ ...current, mediaCondition }))}
                columns={GRADE_COLUMNS}
              />
              {draft.mediaCondition ? <Detail>{gradeDetail(draft.mediaCondition)}</Detail> : null}
            </Section>
            <Section label={t('newListing.condition.sleeve')}>
              <ChipGrid
                label={t('newListing.condition.sleeve')}
                options={gradeOptions}
                value={draft.sleeveCondition}
                onChange={(sleeveCondition) => change((current) => ({ ...current, sleeveCondition }))}
                columns={GRADE_COLUMNS}
              />
            </Section>
          </>
        ) : (
          <Section label={t('newListing.condition.equipment')}>
            <ChipGrid
              label={t('newListing.condition.equipment')}
              options={equipmentConditionOptions()}
              value={draft.equipmentCondition}
              onChange={(equipmentCondition) =>
                change((current) => ({ ...current, equipmentCondition }))
              }
              columns={EQUIPMENT_CONDITION_COLUMNS}
            />
            {draft.equipmentCondition ? (
              <Detail>{equipmentConditionDetail(draft.equipmentCondition)}</Detail>
            ) : null}
          </Section>
        )}
        <Section label={t('newListing.photos.count', { count: draft.photos.length, max: MAX_PHOTOS })}>
          <PhotoGrid
            photos={draft.photos}
            max={MAX_PHOTOS}
            columns={PHOTO_COLUMNS}
            adding={addingPhoto}
            onAdd={choosePhotoSource}
            onPressPhoto={confirmRemoval}
            addLabel={t('newListing.photos.add')}
            addAccessibilityLabel={t('newListing.photos.add.label')}
            photoAccessibilityLabel={(position) =>
              t('newListing.photos.photo', { position, count: draft.photos.length })
            }
            photoAccessibilityHint={t('newListing.photos.photo.hint')}
          />
          {photoProblem ? <Detail tone="error">{t(photoProblem)}</Detail> : null}
        </Section>
        <TextField
          label={t('newListing.description.label')}
          placeholder={t('newListing.description.placeholder')}
          value={draft.description}
          onChangeText={(description) => change((current) => ({ ...current, description }))}
          multiline
        />
      </View>
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

function Detail({ tone = 'muted', children }: { tone?: 'muted' | 'error'; children: string }) {
  return (
    <AppText variant="rowMeta" color={tone}>
      {children}
    </AppText>
  );
}

const styles = StyleSheet.create({
  sections: {
    gap: Spacing.x6,
  },
  section: {
    gap: Spacing.x2,
  },
});
