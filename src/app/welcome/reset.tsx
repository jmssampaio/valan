import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { BackLink } from '@/components/back-link';
import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { Spacing } from '@/constants/theme';
import { failureMessage, isEmail, type AuthFailure } from '@/features/auth/rules';
import { useAuthFlow } from '@/hooks/use-auth-flow';
import { useIsOnline } from '@/hooks/use-is-online';
import { t } from '@/i18n';
import { requestPasswordReset } from '@/services/auth';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const isOnline = useIsOnline();
  const { pendingEmail, setPendingEmail } = useAuthFlow();
  // Starts with the address typed in the sign-in form, if there was one.
  const [email, setEmail] = useState(pendingEmail ?? '');
  const [failure, setFailure] = useState<AuthFailure | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  // Two presses can land before the next render; only the first may send the request.
  const inFlight = useRef(false);

  async function send() {
    if (inFlight.current) return;
    inFlight.current = true;
    setIsBusy(true);
    setFailure(null);

    try {
      const outcome = await requestPasswordReset(email);
      if (outcome.ok) {
        // The same next screen whether or not the email has an account.
        setPendingEmail(email.trim());
        router.push('/welcome/new-password');
      } else {
        setFailure(outcome.failure);
      }
    } finally {
      inFlight.current = false;
      setIsBusy(false);
    }
  }

  return (
    <Screen
      title={t('auth.reset.title')}
      titleSize="medium"
      titleGap="x3"
      scroll
      header={
        <BackLink
          label={t('common.back')}
          accessibilityLabel={t('common.back.spoken')}
          onPress={() => router.back()}
        />
      }
      footer={
        <>
          {isOnline ? null : (
            <AppText variant="rowMeta" color="muted" accessibilityRole="alert">
              {t('auth.failure.offline')}
            </AppText>
          )}
          <Button
            label={t('auth.reset.submit')}
            disabled={!isOnline || isBusy || !isEmail(email)}
            onPress={() => void send()}
          />
        </>
      }>
      <View style={styles.form}>
        <AppText color="muted">{t('auth.reset.body')}</AppText>
        <TextField
          label={t('auth.email.label')}
          placeholder={t('auth.email.placeholder')}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="done"
        />
        {failure ? (
          <AppText variant="rowMeta" color="error" accessibilityRole="alert">
            {t(failureMessage(failure))}
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
});
