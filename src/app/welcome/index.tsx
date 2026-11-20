import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import valanIcon from '../../../assets/images/valan-icon.svg';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { Wave } from '@/components/wave';
import { Size, Spacing } from '@/constants/theme';
import { t } from '@/i18n';
import { formatList } from '@/i18n/list';
import { supportedMarketplaces } from '@/services/marketplaces';

const WORDMARK = 'VALAN';
const noAction = () => {};

export default function WelcomeScreen() {
  const router = useRouter();
  const marketplaces = formatList(supportedMarketplaces().map(({ name }) => name));

  return (
    <Screen
      title={t('welcome.title')}
      titleGap="x3"
      header={
        <View style={styles.brand}>
          <View accessible accessibilityRole="image" accessibilityLabel={WORDMARK} style={styles.logo}>
            <Image source={valanIcon} contentFit="contain" style={styles.icon} />
            <AppText variant="wordmark">{WORDMARK}</AppText>
          </View>
          <Wave />
        </View>
      }
      footer={
        <>
          {/* Shown so the seller knows they are coming; they work once the developer accounts exist. */}
          <Button
            label={t('welcome.soon', { action: t('welcome.apple') })}
            variant="dark"
            disabled
            onPress={noAction}
          />
          <Button
            label={t('welcome.soon', { action: t('welcome.google') })}
            variant="dark"
            disabled
            onPress={noAction}
          />
          <Button
            label={t('welcome.email')}
            variant="secondary"
            onPress={() => router.push('/welcome/email')}
          />
          <AppText variant="rowMeta" color="muted" style={styles.terms}>
            {t('welcome.terms')}
          </AppText>
        </>
      }>
      <AppText color="muted">{t('welcome.tagline', { marketplaces })}</AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  brand: {
    gap: Spacing.x8,
    paddingTop: Spacing.x5,
    paddingBottom: Spacing.x8,
  },
  logo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.x4,
  },
  icon: {
    width: Size.logo,
    height: Size.logo,
  },
  terms: {
    textAlign: 'center',
    marginTop: Spacing.x1,
  },
});
