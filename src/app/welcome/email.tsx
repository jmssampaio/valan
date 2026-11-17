import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { BackLink } from '@/components/back-link';
import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { SegmentedControl } from '@/components/segmented-control';
import { TextField } from '@/components/text-field';
import { Spacing } from '@/constants/theme';
import {
  failureMessage,
  isAcceptablePassword,
  isEmail,
  type AuthFailure,
} from '@/features/auth/rules';
import { useAuthFlow } from '@/hooks/use-auth-flow';
import { useIsOnline } from '@/hooks/use-is-online';
import { deviceLanguage, t } from '@/i18n';
import { resendCode, signIn, signUp } from '@/services/auth';

type Mode = 'signIn' | 'signUp';

export default function EmailAuthScreen() {
  const router = useRouter();
  const isOnline = useIsOnline();
  const { setPendingEmail } = useAuthFlow();
  const [mode, setMode] = useState<Mode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showsPassword, setShowsPassword] = useState(false);
  const [failure, setFailure] = useState<AuthFailure | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  // Two presses can land before the next render; only the first may send the request.
  const inFlight = useRef(false);

  const isSigningUp = mode === 'signUp';
  // Signing in accepts any password that was ever set; only a new one must meet the rule.
  const passwordIsUsable = isSigningUp ? isAcceptablePassword(password) : password !== '';
  const canSubmit = isOnline && !isBusy && isEmail(email) && passwordIsUsable;

  function awaitCode() {
    setPendingEmail(email.trim());
    router.push('/welcome/confirm');
  }

  async function submit() {
    if (inFlight.current) return;
    inFlight.current = true;
    setIsBusy(true);
    setFailure(null);

    try {
      const outcome = isSigningUp
        ? await signUp(email, password, deviceLanguage)
        : await signIn(email, password);

      if (outcome.ok) {
        // Signing in changes the session, and the app moves to the listings by itself.
        if (isSigningUp) awaitCode();
      } else if (outcome.failure === 'unconfirmed') {
        // The password was right: send a fresh code and go and ask for it.
        await resendCode(email);
        awaitCode();
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
      title={t(isSigningUp ? 'auth.title.signUp' : 'auth.title.signIn')}
      titleSize="medium"
      titleGap="x5"
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
            label={t(isSigningUp ? 'auth.submit.signUp' : 'auth.submit.signIn')}
            disabled={!canSubmit}
            onPress={() => void submit()}
          />
        </>
      }>
      <View style={styles.form}>
        <SegmentedControl
          label={t('auth.mode.label')}
          options={[
            { value: 'signIn', label: t('auth.mode.signIn') },
            { value: 'signUp', label: t('auth.mode.signUp') },
          ]}
          value={mode}
          onChange={(next) => {
            setMode(next);
            setFailure(null);
          }}
        />
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
          returnKeyType="next"
        />
        <View style={styles.password}>
          <TextField
            label={t('auth.password.label')}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showsPassword}
            autoCapitalize="none"
            autoCorrect={false}
            // Lets the keychain offer a saved password, or a strong new one when signing up.
            autoComplete={isSigningUp ? 'new-password' : 'current-password'}
            textContentType={isSigningUp ? 'newPassword' : 'password'}
            returnKeyType="done"
          />
          {isSigningUp ? (
            <AppText variant="rowMeta" color="muted">
              {t('auth.password.hint')}
            </AppText>
          ) : null}
          <Button
            label={t(showsPassword ? 'auth.password.hide' : 'auth.password.show')}
            variant="text"
            size="small"
            onPress={() => setShowsPassword((shown) => !shown)}
          />
        </View>
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
  password: {
    gap: Spacing.x2,
    alignItems: 'stretch',
  },
});
