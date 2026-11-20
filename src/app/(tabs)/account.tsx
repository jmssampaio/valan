import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { Spacing } from '@/constants/theme';
import { failureMessage, type AuthFailure } from '@/features/auth/rules';
import { useSession } from '@/hooks/use-session';
import { t } from '@/i18n';
import { signOut } from '@/services/auth';

export default function AccountScreen() {
  const router = useRouter();
  const session = useSession();
  const [failure, setFailure] = useState<AuthFailure | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const inFlight = useRef(false);

  async function leave() {
    if (inFlight.current) return;
    inFlight.current = true;
    setIsBusy(true);
    setFailure(null);
    try {
      const outcome = await signOut();
      // On success the session ends, and the app moves to the entry screen by itself.
      if (!outcome.ok) setFailure(outcome.failure);
    } finally {
      inFlight.current = false;
      setIsBusy(false);
    }
  }

  const email = session.status === 'signedIn' ? session.session.email : null;

  return (
    <Screen title={t('tabs.account')}>
      <View style={styles.account}>
        {email ? (
          <View style={styles.identity}>
            <AppText variant="label" color="muted">
              {t('account.signedInAs')}
            </AppText>
            <AppText>{email}</AppText>
          </View>
        ) : null}
        <Button
          label={t('account.signOut')}
          variant="secondary"
          disabled={isBusy}
          onPress={() => void leave()}
        />
        {failure ? (
          <AppText variant="rowMeta" color="danger" accessibilityRole="alert">
            {t(failureMessage(failure))}
          </AppText>
        ) : null}
        {/* Opens its own screen, which explains what is lost and asks for the password. */}
        <Button
          label={t('account.delete')}
          variant="dangerLink"
          disabled={isBusy}
          onPress={() => router.push('/delete-account')}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  account: {
    gap: Spacing.x6,
  },
  identity: {
    gap: Spacing.x1,
  },
});
