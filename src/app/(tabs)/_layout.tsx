import { Tabs } from 'expo-router/js-tabs';

import { TabBar } from '@/components/tab-bar';
import { PendingOffersProvider, usePendingOffers } from '@/hooks/use-pending-offers';
import { t } from '@/i18n';

export default function TabsLayout() {
  return (
    <PendingOffersProvider>
      <TabsWithBadges />
    </PendingOffersProvider>
  );
}

function TabsWithBadges() {
  const pendingOffers = usePendingOffers().count ?? 0;
  const badges = {
    offers: {
      count: pendingOffers,
      accessibilityLabel: t(pendingOffers === 1 ? 'tabs.offers.badge.one' : 'tabs.offers.badge.other', {
        count: pendingOffers,
      }),
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
