import { sampleReleases } from './sample-catalogue';

/** One release in the Discogs catalogue: what a record is listed against. */
export type CatalogueRelease = {
  /** The Discogs release id. */
  id: number;
  title: string;
  artist: string;
  /** As the catalogue words it: "LP, Album". */
  format: string;
  year: number | null;
  country: string | null;
  label: string | null;
  catalogueNumber: string | null;
};

/** Whose catalogue this is. Shown to the seller, so the screens never write the name themselves. */
export const CATALOGUE_NAME = 'Discogs';

/** A single letter matches half the catalogue, so a search starts at two. */
export const MIN_QUERY_LENGTH = 2;

/** Lower case and without accents, so "mares" finds "Marés". */
function simplify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

// Sample data until the catalogue Edge Function exists; callers already get the final shape.
export async function searchReleases(query: string): Promise<CatalogueRelease[]> {
  const wanted = simplify(query);
  if (wanted.length < MIN_QUERY_LENGTH) return [];

  return sampleReleases.filter((release) =>
    [release.title, release.artist, release.catalogueNumber ?? ''].some((field) =>
      simplify(field).includes(wanted),
    ),
  );
}
