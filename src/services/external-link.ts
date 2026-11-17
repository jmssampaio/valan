import { Linking } from 'react-native';

/**
 * Opens a marketplace's page in the system. The address comes from the database, so only a
 * secure web address is opened: nothing else may be reached through it.
 */
export async function openExternal(address: string): Promise<void> {
  const isSecureWebAddress = URL.canParse(address) && new URL(address).protocol === 'https:';
  if (!isSecureWebAddress) throw new Error('Only a secure web address can be opened.');

  await Linking.openURL(address);
}
