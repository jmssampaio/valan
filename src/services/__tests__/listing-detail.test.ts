import { saveDraft, type DraftItemFields } from '../drafts';
import {
  deleteDraft,
  getListingDetail,
  pauseItem,
  removeItem,
  resumeItem,
  retryFailedListing,
} from '../listing-detail';
import { listItems } from '../listings';
import { publishItem } from '../publishing';

// Every test makes its own item, so none depends on what another did to the shared samples.
let counter = 0;
function newFields(): DraftItemFields {
  counter += 1;
  return {
    id: `detail-test-${counter}`,
    type: 'record',
    title: `Disco de teste ${counter}`,
    artist: 'Os Testes',
    discogs_release_id: 1,
    format: 'LP, Album',
    release_year: 1978,
    media_condition: 'VG+',
    sleeve_condition: 'VG',
    equipment_condition: null,
    description: null,
    price_minor: 2800,
    currency: 'EUR',
    accepts_offers: true,
  };
}

/** Published on Discogs; eBay refuses it once, as the sample marketplace does. */
async function sentEverywhere() {
  const item = newFields();
  await publishItem({ item, photos: [], marketplaces: ['discogs', 'ebay'] });
  return item;
}

async function aDraft() {
  const item = newFields();
  await saveDraft({ item, photos: [] });
  return item;
}

describe('getListingDetail', () => {
  it('returns null for an id that does not exist', async () => {
    expect(await getListingDetail('nothing-here')).toBeNull();
  });

  it('returns the item with its listings, visits and pending offers', async () => {
    const detail = await getListingDetail('sample-item-1');

    expect(detail?.item.title).toBe('Noites de Lisboa');
    expect(detail?.listings.map(({ marketplace, status, visits }) => [marketplace, status, visits])).toEqual([
      ['discogs', 'published', 14],
      ['ebay', 'published', 32],
    ]);
    expect(detail?.offers.map(({ listing_id, status }) => [listing_id, status])).toEqual([
      ['sample-item-1-ebay', 'pending'],
    ]);
    expect(detail?.sale).toBeNull();
  });

  it('gives a refused listing the reason the marketplace gave', async () => {
    const detail = await getListingDetail('sample-item-2');

    const ebay = detail?.listings.find(({ marketplace }) => marketplace === 'ebay');
    expect(ebay).toMatchObject({ status: 'error', reason: 'missingShippingPolicy' });
  });

  it('shows what an item sent for publishing became on each marketplace', async () => {
    const item = await sentEverywhere();

    const detail = await getListingDetail(item.id);

    expect(detail?.item.status).toBe('active');
    expect(detail?.listings.map(({ marketplace, status }) => [marketplace, status])).toEqual([
      ['discogs', 'published'],
      ['ebay', 'error'],
    ]);
  });

  it('gives a draft no listings and no offers', async () => {
    const item = await aDraft();

    const detail = await getListingDetail(item.id);

    expect(detail?.item.status).toBe('draft');
    expect(detail?.listings).toEqual([]);
    expect(detail?.offers).toEqual([]);
  });

  it('gives a sold item the sale, with the snapshot and the fees', async () => {
    const detail = await getListingDetail('sample-item-15');

    expect(detail?.item.status).toBe('sold');
    expect(detail?.sale).toMatchObject({
      item_title: 'Sete Colinas',
      marketplace: 'ebay',
      price_minor: 18000,
      fees_minor: 2340,
    });
  });
});

describe('saving a draft that was already there', () => {
  it('updates one of the sample drafts instead of adding a second item with its id', async () => {
    await saveDraft({ item: { ...newFields(), id: 'sample-item-13', title: 'Lado B' }, photos: [] });

    const same = (await listItems()).filter(({ id }) => id === 'sample-item-13');

    expect(same.map(({ title }) => title)).toEqual(['Lado B']);
    expect((await getListingDetail('sample-item-13'))?.item.title).toBe('Lado B');
  });
});

describe('pauseItem and resumeItem', () => {
  it('pauses the published listings and leaves the rest alone', async () => {
    const item = await sentEverywhere();

    await pauseItem(item.id);

    const detail = await getListingDetail(item.id);
    expect(detail?.item.status).toBe('active');
    expect(detail?.listings.map(({ marketplace, status }) => [marketplace, status])).toEqual([
      ['discogs', 'paused'],
      ['ebay', 'error'],
    ]);
  });

  it('puts the paused listings back when resumed', async () => {
    const item = await sentEverywhere();
    await pauseItem(item.id);

    await resumeItem(item.id);

    const detail = await getListingDetail(item.id);
    expect(detail?.listings.find(({ marketplace }) => marketplace === 'discogs')?.status).toBe(
      'published',
    );
  });

  it('refuses to pause a draft', async () => {
    const item = await aDraft();

    await expect(pauseItem(item.id)).rejects.toThrow();
  });

  it('refuses an item that does not exist', async () => {
    await expect(pauseItem('nothing-here')).rejects.toThrow();
  });
});

describe('removeItem', () => {
  it('takes the item off every marketplace and out of the lists', async () => {
    const item = await sentEverywhere();

    await removeItem(item.id);

    expect(await getListingDetail(item.id)).toBeNull();
    const listed = await listItems();
    expect(listed.find(({ id }) => id === item.id)?.status).toBe('removed');
    expect(listed.find(({ id }) => id === item.id)?.listings.map(({ status }) => status)).toEqual([
      'removed',
      'removed',
    ]);
  });

  it('refuses to remove a draft: a draft is deleted instead', async () => {
    const item = await aDraft();

    await expect(removeItem(item.id)).rejects.toThrow();
  });
});

describe('deleteDraft', () => {
  it('deletes the draft', async () => {
    const item = await aDraft();

    await deleteDraft(item.id);

    expect(await getListingDetail(item.id)).toBeNull();
    expect((await listItems()).some(({ id }) => id === item.id)).toBe(false);
  });

  it('deletes one of the sample drafts too', async () => {
    await deleteDraft('sample-item-14');

    expect((await listItems()).some(({ id }) => id === 'sample-item-14')).toBe(false);
  });

  it('refuses to delete an item that is not a draft', async () => {
    const item = await sentEverywhere();

    await expect(deleteDraft(item.id)).rejects.toThrow();
    expect(await getListingDetail(item.id)).not.toBeNull();
  });
});

describe('retryFailedListing', () => {
  it('publishes the listing that was refused', async () => {
    const item = await sentEverywhere();

    await retryFailedListing(item.id, 'ebay');

    const detail = await getListingDetail(item.id);
    expect(detail?.listings.map(({ marketplace, status }) => [marketplace, status])).toEqual([
      ['discogs', 'published'],
      ['ebay', 'published'],
    ]);
  });

  it('never makes a second listing when asked twice', async () => {
    const item = await sentEverywhere();

    await retryFailedListing(item.id, 'ebay');
    await retryFailedListing(item.id, 'ebay');

    const detail = await getListingDetail(item.id);
    expect(detail?.listings).toHaveLength(2);
  });

  it('refuses a marketplace the item was never sent to', async () => {
    const item = await aDraft();

    await expect(retryFailedListing(item.id, 'ebay')).rejects.toThrow();
  });
});
