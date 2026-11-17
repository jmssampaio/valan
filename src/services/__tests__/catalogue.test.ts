import { searchReleases } from '../catalogue';

describe('searchReleases', () => {
  it('finds releases by title, whatever the capitals and accents', async () => {
    const releases = await searchReleases('NOITES de lisboa');

    expect(releases.map((release) => release.catalogueNumber)).toEqual(['OD 1042', 'OD 2210', 'ODCD 88']);
  });

  it('finds releases by artist', async () => {
    const releases = await searchReleases('os mares');

    expect(releases.length).toBeGreaterThan(0);
    expect(releases.every((release) => release.artist === 'Os Marés')).toBe(true);
  });

  it('finds a release by its catalogue number', async () => {
    const releases = await searchReleases('od 2210');

    expect(releases).toHaveLength(1);
    expect(releases[0]).toMatchObject({ format: 'LP, Reissue', year: 1994, country: 'Europa' });
  });

  it('returns nothing for a query that matches no release', async () => {
    expect(await searchReleases('zzzz')).toEqual([]);
  });

  it('does not search for fewer than two characters', async () => {
    expect(await searchReleases(' n ')).toEqual([]);
  });
});
