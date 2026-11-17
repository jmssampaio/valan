import { useRouter } from 'expo-router';

import { FlowHeader } from '@/components/flow-header';
import { Screen } from '@/components/screen';
import { stepHeader } from '@/features/new-listing/labels';
import { t } from '@/i18n';

export default function NewListingPriceScreen() {
  const router = useRouter();

  return (
    <Screen
      title={t('newListing.price.title')}
      titleSize="medium"
      titleGap="x5"
      header={
        <FlowHeader
          {...stepHeader(3)}
          leading={{
            label: t('common.back'),
            accessibilityLabel: t('common.back.spoken'),
            onPress: () => router.back(),
          }}
        />
      }
    />
  );
}
