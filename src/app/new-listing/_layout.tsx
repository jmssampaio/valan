import { usePreventRemove } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { useRef, useState } from 'react';
import { Alert } from 'react-native';

import { draftItemFields, isWorthSaving } from '@/features/new-listing/draft';
import { ListingDraftProvider, useListingDraft } from '@/hooks/use-listing-draft';
import { t } from '@/i18n';
import { saveDraft } from '@/services/drafts';

export default function NewListingLayout() {
  return (
    <ListingDraftProvider>
      <SaveDraftOnLeave />
      <Stack screenOptions={{ headerShown: false }} />
    </ListingDraftProvider>
  );
}

/**
 * Holds the flow open while the draft is saved, however the seller leaves it: the Cancel
 * button or swiping the sheet down. If the save fails the seller chooses what happens next.
 */
function SaveDraftOnLeave() {
  const { draft, publication } = useListingDraft();
  // True once the draft is saved or given up: leaving then goes ahead.
  const [released, setReleased] = useState(false);
  const saving = useRef(false);

  async function saveThenLeave(leave: () => void) {
    if (saving.current) return;
    saving.current = true;

    const release = () => {
      setReleased(true);
      leave();
    };

    try {
      await saveDraft({ item: draftItemFields(draft), photos: draft.photos });
      release();
    } catch {
      Alert.alert(t('newListing.leave.failed.title'), t('newListing.leave.failed.body'), [
        { text: t('common.retry'), onPress: () => void saveThenLeave(leave) },
        { text: t('newListing.leave.discard'), style: 'destructive', onPress: release },
        { text: t('newListing.leave.stay'), style: 'cancel' },
      ]);
    } finally {
      saving.current = false;
    }
  }

  // Once a listing is sent, or on its way, the server has it: there is no draft left to save,
  // and the seller can always leave. Its state shows in the listings.
  const isSent = publication.status === 'publishing' || publication.status === 'done';

  usePreventRemove(isWorthSaving(draft) && !released && !isSent, ({ repeat }) => {
    void saveThenLeave(repeat);
  });

  return null;
}
