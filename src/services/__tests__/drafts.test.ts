import { saveDraft } from '../drafts';
import { listItems } from '../listings';

const fields = {
  type: 'record',
  title: 'Noites de Lisboa',
  artist: 'Os Marés',
  discogs_release_id: 249504,
  format: 'LP, Album',
  release_year: 1978,
  media_condition: 'VG+',
  sleeve_condition: null,
  equipment_condition: null,
  description: null,
  price_minor: null,
  currency: 'EUR',
  accepts_offers: false,
} as const;

describe('saveDraft', () => {
  it('adds the item to the seller\'s listings as a draft without a price', async () => {
    const { id } = await saveDraft({ item: fields, photos: [] });

    const saved = (await listItems()).find((item) => item.id === id);
    expect(saved).toMatchObject({ ...fields, status: 'draft', price_minor: null, listings: [] });
  });

  it('shows the first photo on the saved item', async () => {
    const { id } = await saveDraft({
      item: fields,
      photos: [{ uri: 'file:///front.jpg' }, { uri: 'file:///back.jpg' }],
    });

    const saved = (await listItems()).find((item) => item.id === id);
    expect(saved?.photo).toEqual({ uri: 'file:///front.jpg' });
  });

  it('gives every saved draft its own id', async () => {
    const first = await saveDraft({ item: fields, photos: [] });
    const second = await saveDraft({ item: fields, photos: [] });

    expect(first.id).not.toBe(second.id);
  });
});
