// Stand-in for the Discogs catalogue, used until the search Edge Function exists.
// The first three releases are the ones drawn in docs/design/mockups/04-novo-catalogo.png.

import type { CatalogueRelease } from './catalogue';

export const sampleReleases: CatalogueRelease[] = [
  { id: 249504, title: 'Noites de Lisboa', artist: 'Os Marés', format: 'LP, Album', year: 1978, country: 'Portugal', label: 'Onda Discos', catalogueNumber: 'OD 1042' },
  { id: 249505, title: 'Noites de Lisboa', artist: 'Os Marés', format: 'LP, Reissue', year: 1994, country: 'Europa', label: 'Onda Discos', catalogueNumber: 'OD 2210' },
  { id: 249506, title: 'Noites de Lisboa (Ao Vivo)', artist: 'Os Marés', format: 'CD', year: 2003, country: 'Portugal', label: 'Onda Discos', catalogueNumber: 'ODCD 88' },
  { id: 249610, title: 'Sete Colinas', artist: 'Os Marés', format: 'LP, Album', year: 1981, country: 'Portugal', label: 'Onda Discos', catalogueNumber: 'OD 1077' },
  { id: 310201, title: 'Blue Harbor Sessions', artist: 'The Lanterns', format: '2×LP, Album', year: 1969, country: 'UK', label: 'Greyline', catalogueNumber: 'GL 204' },
  { id: 310777, title: 'Verde Mar', artist: 'Quarteto Atlântico', format: 'LP, Album', year: 1974, country: 'Portugal', label: 'Farol', catalogueNumber: 'FRL 31' },
  { id: 402118, title: 'Cartas do Norte', artist: 'Trio Alvorada', format: 'CD, Album', year: 1998, country: 'Portugal', label: 'Farol', catalogueNumber: 'FRLCD 12' },
  { id: 518340, title: 'Paper Lighthouses', artist: 'June & the Tide', format: 'LP, Album', year: 2011, country: 'US', label: null, catalogueNumber: null },
  { id: 518900, title: 'Fado Elétrico', artist: 'As Andorinhas', format: 'LP, Album', year: 1972, country: null, label: 'Onda Discos', catalogueNumber: 'OD 0931' },
  { id: 620455, title: 'Night Ferry', artist: 'The Salt Choir', format: '7", Single', year: null, country: 'UK', label: 'Greyline', catalogueNumber: 'GL 45-18' },
];
