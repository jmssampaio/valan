import { useRouter } from 'expo-router';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { t } from '@/i18n';

export default function NotFoundScreen() {
  const router = useRouter();

  return (
    <Screen title={t('notFound.title')} titleSize="medium">
      <Button label={t('notFound.action')} onPress={() => router.replace('/')} />
    </Screen>
  );
}
