import { saveDraft } from '../drafts';
import { newItemId } from '../ids';
import { listItems } from '../listings';
import { publishItem } from '../publishing';

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

/** A draft with the id the device gave it. */
function draft(id = newItemId()) {
  return { ...fields, id };
}

async function itemsWithId(id: string) {
  return (await listItems()).filter((item) => item.id === id);
}

describe('newItemId', () => {
  it('gives a different id each time, in the shape the database expects', () => {
    const first = newItemId();

    expect(first).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(newItemId()).not.toBe(first);
  });
});

describe('saveDraft', () => {
  it('adds the item to the seller\'s listings as a draft, under the id the device gave it', async () => {
    const item = draft();

    const { id } = await saveDraft({ item, photos: [] });

    expect(id).toBe(item.id);
    expect(await itemsWithId(id)).toEqual([
      expect.objectContaining({ ...fields, status: 'draft', listings: [] }),
    ]);
  });

  it('shows the first photo on the saved item', async () => {
    const { id } = await saveDraft({
      item: draft(),
      photos: [{ uri: 'file:///front.jpg' }, { uri: 'file:///back.jpg' }],
    });

    expect((await itemsWithId(id))[0].photo).toEqual({ uri: 'file:///front.jpg' });
  });

  it('updates the same item when the draft is saved again, never a second one', async () => {
    const item = draft();
    await saveDraft({ item, photos: [] });

    await saveDraft({ item: { ...item, description: 'Primeira edição.', price_minor: 2800 }, photos: [] });

    expect(await itemsWithId(item.id)).toEqual([
      expect.objectContaining({ description: 'Primeira edição.', price_minor: 2800, status: 'draft' }),
    ]);
  });

  it('does not make a second item, or undo the listings, when saved after a publish attempt', async () => {
    const item = { ...draft(), price_minor: 2800 };
    await publishItem({ item, photos: [], marketplaces: ['discogs'] });

    await saveDraft({ item, photos: [] });

    const [saved, ...others] = await itemsWithId(item.id);
    expect(others).toEqual([]);
    // The status and the listings are the server's to decide: the app cannot turn them back.
    expect(saved).toMatchObject({ status: 'active', listings: [{ marketplace: 'discogs', status: 'published' }] });
  });
});
