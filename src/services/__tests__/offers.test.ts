import { listItems } from '../listings';
import { countPendingOffers } from '../offers';

jest.mock('../listings');

describe('countPendingOffers', () => {
  it('counts nothing for a seller without listings', async () => {
    jest.mocked(listItems).mockResolvedValue([]);

    expect(await countPendingOffers()).toBe(0);
  });
});
