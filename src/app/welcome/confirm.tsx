import { Redirect, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { BackLink } from '@/components/back-link';
import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { Spacing } from '@/constants/theme';
import { CODE_LENGTH, failureMessage, isCode, type AuthFailure } from '@/features/auth/rules';
import { useAuthFlow } from '@/hooks/use-auth-flow';
import { useIsOnline } from '@/hooks/use-is-online';
import { t } from '@/i18n';
import { confirmEmail, resendCode } from '@/services/auth';

// The server sends one email a minute to an address; asking sooner only gets a refusal.
const RESEND_AFTER_MS = 60_000;

export default function ConfirmEmailScreen() {
  const router = useRouter();
  const isOnline = useIsOnline();
  const { pendingEmail } = useAuthFlow();
  const [code, setCode] = useState('');
  const [failure, setFailure] = useState<AuthFailure | null>(null);
  const [wasResent, setWasResent] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  // Counts the codes sent, so the wait starts again after each one.
  const [codesSent, setCodesSent] = useState(1);
  const [canResend, setCanResend] = useState(false);
  const inFlight = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => setCanResend(true), RESEND_AFTER_MS);
    return () => clearTimeout(timer);
  }, [codesSent]);

  // Opened without an address to confirm: the form is where this starts.
  if (pendingEmail === null) {
    return <Redirect href="/welcome/email" />;
  }
  const email = pendingEmail;

  async function run(action: () => Promise<void>) {
    if (inFlight.current) return;
    inFlight.current = true;
    setIsBusy(true);
    setFailure(null);
    setWasResent(false);
    try {
      await action();
    } finally {
      inFlight.current = false;
      setIsBusy(false);
    }
  }

  const confirm = () =>
    run(async () => {
      const outcome = await confirmEmail(email, code);
      // On success the session changes, and the app moves to the listings by itself.
      if (!outcome.ok) setFailure(outcome.failure);
    });

  const resend = () =>
    run(async () => {
      const outcome = await resendCode(email);
      if (outcome.ok) {
        setWasResent(true);
        setCanResend(false);
        setCodesSent((sent) => sent + 1);
      } else {
        setFailure(outcome.failure);
      }
    });

  return (
    <Screen
      title={t('auth.confirm.title')}
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
            label={t('auth.confirm.submit')}
            disabled={!isOnline || isBusy || !isCode(code)}
            onPress={() => void confirm()}
          />
        </>
      }>
      <View style={styles.form}>
        <AppText color="muted">{t('auth.confirm.body', { email })}</AppText>
        <TextField
          label={t('auth.code.label')}
          placeholder={t('auth.code.placeholder')}
          value={code}
          onChangeText={setCode}
          keyboardType="number-pad"
          maxLength={CODE_LENGTH}
          // Lets iOS offer the code straight from the email.
          textContentType="oneTimeCode"
          autoComplete="one-time-code"
        />
        {failure ? (
          <AppText variant="rowMeta" color="danger" accessibilityRole="alert">
            {t(failureMessage(failure))}
          </AppText>
        ) : null}
        {wasResent ? (
          <AppText variant="rowMeta" color="muted" accessibilityRole="alert">
            {t('auth.confirm.resent')}
          </AppText>
        ) : null}
        <View style={styles.resend}>
          <Button
            label={t('auth.confirm.resend')}
            variant="secondary"
            size="compact"
            disabled={!isOnline || isBusy || !canResend}
            onPress={() => void resend()}
          />
          {canResend ? null : (
            <AppText variant="rowMeta" color="muted">
              {t('auth.confirm.resend.wait')}
            </AppText>
          )}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: Spacing.x5,
  },
  resend: {
    alignItems: 'flex-start',
    gap: Spacing.x2,
  },
});
