import { useGlobalSearchParams, usePreventRemove, useRouter } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { useRef, useState } from 'react';
import { ActivityIndicator, Alert, View, StyleSheet } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { ScreenMessage } from '@/components/screen-message';
import { Colors } from '@/constants/theme';
import { draftItemFields, isWorthSaving, type ListingDraft } from '@/features/new-listing/draft';
import { useIsOnline } from '@/hooks/use-is-online';
import { ListingDraftProvider, useListingDraft } from '@/hooks/use-listing-draft';
import { useReopenedDraft } from '@/hooks/use-reopened-draft';
import { t } from '@/i18n';
import { saveDraft } from '@/services/drafts';

// A draft opened straight at a later step still has the first step under it, so Back
// reaches it: that is where the seller picks a catalogue edition.
export const unstable_settings = {
  anchor: 'catalogue',
};

export default function NewListingLayout() {
  const { draft: draftId } = useGlobalSearchParams<{ draft?: string }>();
  // Read once: the later steps carry no such parameter, and the flow must keep its draft.
  const [reopening] = useState(draftId);

  return reopening ? <ReopenedFlow itemId={reopening} /> : <Flow />;
}

function Flow({ initialDraft }: { initialDraft?: ListingDraft }) {
  return (
    <ListingDraftProvider initialDraft={initialDraft}>
      <SaveDraftOnLeave />
      <Stack screenOptions={{ headerShown: false }} />
    </ListingDraftProvider>
  );
}

/** Opens the flow with a saved draft, once it is loaded. */
function ReopenedFlow({ itemId }: { itemId: string }) {
  const router = useRouter();
  const isOnline = useIsOnline();
  const reopened = useReopenedDraft(itemId);

  if (reopened.status === 'ready') return <Flow initialDraft={reopened.draft} />;

  return (
    <Screen
      title={t('listing.title')}
      titleSize="medium"
      titleGap="x4"
      // Until the draft is open there is no step to go back from: this is the way out.
      footer={<Button label={t('common.close')} variant="outline" onPress={() => router.dismissTo('/')} />}>
      {reopened.status === 'loading' ? (
        <View style={styles.loading}>
          <ActivityIndicator accessibilityLabel={t('newListing.reopen.loading')} color={Colors.ink} />
        </View>
      ) : reopened.status === 'unavailable' ? (
        <ScreenMessage
          title={t('newListing.reopen.unavailable.title')}
          body={t('newListing.reopen.unavailable.body')}
        />
      ) : (
        <ScreenMessage
          title={t(isOnline ? 'newListing.reopen.error.title' : 'listings.offline.title')}
          body={t(isOnline ? 'newListing.reopen.error.body' : 'newListing.reopen.offline.body')}
          action={{ label: t('common.retry'), onPress: reopened.reload }}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

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
