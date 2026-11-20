import { useFonts } from 'expo-font';

import { Fonts } from '@/constants/theme';

/**
 * The expo-font config plugin embeds fonts in native builds only, so the browser loads them
 * at runtime. Keep this list in step with the plugin's list in app.json.
 */
export function useWebFonts() {
  useFonts({
    [Fonts.display]: require('@expo-google-fonts/space-grotesk/600SemiBold/SpaceGrotesk_600SemiBold.ttf'),
    [Fonts.textRegular]: require('@expo-google-fonts/inter/400Regular/Inter_400Regular.ttf'),
    [Fonts.textMedium]: require('@expo-google-fonts/inter/500Medium/Inter_500Medium.ttf'),
    [Fonts.textSemiBold]: require('@expo-google-fonts/inter/600SemiBold/Inter_600SemiBold.ttf'),
    [Fonts.textBold]: require('@expo-google-fonts/inter/700Bold/Inter_700Bold.ttf'),
  });
}
