import { Linking } from 'react-native';

import { openExternal } from '../external-link';

beforeEach(() => jest.clearAllMocks());
afterEach(() => jest.restoreAllMocks());

describe('openExternal', () => {
  it('opens a secure address', async () => {
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);

    await openExternal('https://www.discogs.com/');

    expect(open).toHaveBeenCalledWith('https://www.discogs.com/');
  });

  it.each(['http://www.discogs.com/', 'javascript:alert(1)', 'not an address', ''])(
    'refuses %p, which is not a secure web address',
    async (address) => {
      const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);

      await expect(openExternal(address)).rejects.toThrow();
      expect(open).not.toHaveBeenCalled();
    },
  );

  it('lets the failure through when the address cannot be opened', async () => {
    jest.spyOn(Linking, 'openURL').mockRejectedValue(new Error('cannot open'));

    await expect(openExternal('https://www.discogs.com/')).rejects.toThrow('cannot open');
  });
});
