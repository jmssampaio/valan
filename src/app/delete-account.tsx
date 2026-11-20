import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { BackLink } from '@/components/back-link';
import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { Colors, Spacing } from '@/constants/theme';
import { type AuthFailure } from '@/features/auth/rules';
import { useIsOnline } from '@/hooks/use-is-online';
import { t, type TranslationKey } from '@/i18n';
import { deleteAccount } from '@/services/auth';

/** What to say for each way deleting can fail; here "credentials" can only be the password. */
const messageFor: Partial<Record<AuthFailure, TranslationKey>> = {
  credentials: 'account.delete.wrongPassword',
  offline: 'auth.failure.offline',
  rateLimited: 'auth.failure.rateLimited',
};

export default function DeleteAccountScreen() {
  const router = useRouter();
  const isOnline = useIsOnline();
  const [password, setPassword] = useState('');
  const [failure, setFailure] = useState<AuthFailure | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  // Two presses can land before the next render; only the first may send the request.
  const inFlight = useRef(false);

  async function deleteForGood() {
    if (inFlight.current) return;
    inFlight.current = true;
    setIsBusy(true);
    setFailure(null);

    try {
      const outcome = await deleteAccount(password);
      // On success the session ends, and the app moves to the entry screen by itself.
      if (!outcome.ok) setFailure(outcome.failure);
    } finally {
      inFlight.current = false;
      setIsBusy(false);
    }
  }

  // It cannot be undone, so the seller says so twice: the password, then this.
  function confirm() {
    Alert.alert(t('account.delete.confirm.title'), t('account.delete.confirm.body'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('account.delete.confirm.action'),
        style: 'destructive',
        onPress: () => void deleteForGood(),
      },
    ]);
  }

  return (
    <Screen
      title={t('account.delete')}
      titleSize="medium"
      titleGap="x3"
      scroll
      header={<BackLink label={t('common.cancel')} onPress={() => router.back()} />}
      footer={
        <>
          {isOnline ? null : (
            <AppText variant="rowMeta" color="muted" accessibilityRole="alert">
              {t('auth.failure.offline')}
            </AppText>
          )}
          <Button
            label={t('account.delete')}
            variant="danger"
            disabled={!isOnline || isBusy || password === ''}
            onPress={confirm}
          />
        </>
      }>
      <View style={styles.form}>
        <AppText color="muted">{t('account.delete.body')}</AppText>
        <View style={styles.password}>
          <TextField
            label={t('account.delete.password.label')}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="done"
          />
          <AppText variant="rowMeta" color="muted">
            {t('account.delete.password.hint')}
          </AppText>
        </View>
        {isBusy ? (
          <View style={styles.working}>
            <ActivityIndicator accessibilityLabel={t('account.delete.working')} color={Colors.ink} />
            <AppText variant="rowMeta" color="muted">
              {t('account.delete.working')}
            </AppText>
          </View>
        ) : null}
        {failure ? (
          <AppText variant="rowMeta" color="error" accessibilityRole="alert">
            {t(messageFor[failure] ?? 'account.delete.failed')}
          </AppText>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: Spacing.x5,
  },
  password: {
    gap: Spacing.x2,
  },
  working: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.x3,
  },
});
