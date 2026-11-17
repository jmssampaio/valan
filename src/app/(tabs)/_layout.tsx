import { Tabs } from 'expo-router/js-tabs';

import { TabBar } from '@/components/tab-bar';
import { usePendingOffersCount } from '@/hooks/use-pending-offers-count';
import { t } from '@/i18n';

export default function TabsLayout() {
  const pendingOffers = usePendingOffersCount();
  const badges = {
    offers: {
      count: pendingOffers,
      accessibilityLabel: t('tabs.offers.badge', { count: pendingOffers }),
    },
  };

  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <TabBar {...props} badges={badges} />}>
      <Tabs.Screen name="index" options={{ title: t('tabs.listings') }} />
      <Tabs.Screen name="offers" options={{ title: t('tabs.offers') }} />
      <Tabs.Screen name="sales" options={{ title: t('tabs.sales') }} />
      <Tabs.Screen name="account" options={{ title: t('tabs.account') }} />
    </Tabs>
  );
}
