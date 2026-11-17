import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildMediaProxyUrl,
  buildTypesenseSearchParams,
  cleanSynopsis,
  filterAndSortChapters,
  findAdjacentChapters,
  formatRating,
  formatViews,
  isSafeStaticPath,
  normalizeFormat,
  normalizeSearchDocument,
  normalizeStaticPath,
} from './atsu';
import type { ChapterItem } from '../types/manga';

test('normalizeFormat maps Manwha to Manhwa and defaults safely', () => {
  assert.equal(normalizeFormat('Manwha'), 'Manhwa');
  assert.equal(normalizeFormat('Manga'), 'Manga');
  assert.equal(normalizeFormat(null), 'Manga');
});

test('normalizeStaticPath and buildMediaProxyUrl strip CDN prefixes and prevent unsafe paths', () => {
  assert.equal(
    normalizeStaticPath('https://cdn.atsu.moe/static/posters/abc.jpg'),
    'posters/abc.jpg'
  );
  assert.equal(normalizeStaticPath('/static/pages/C7KP4c/0.webp'), 'pages/C7KP4c/0.webp');
  assert.equal(
    buildMediaProxyUrl('/static/pages/C7KP4c/0.webp'),
    '/api/media?path=pages%2FC7KP4c%2F0.webp'
  );
  assert.equal(isSafeStaticPath('../etc/passwd'), false);
  assert.equal(buildMediaProxyUrl('https://evil.example/foo.jpg'), '');
});

test('formatViews and formatRating format numbers cleanly', () => {
  assert.equal(formatViews(45502878), '45.5M');
  assert.equal(formatViews(12000), '12K');
  assert.equal(formatViews('17.6M'), '17.6M');
  assert.equal(formatViews(0), '—');
  assert.equal(formatRating(8.61466), 8.6);
  assert.equal(formatRating(0), null);
});

test('cleanSynopsis removes source attribution tags and splits paragraphs', () => {
  const input = 'First paragraph.\n*Source: Tappytoon*\n---\nSecond paragraph.';
  assert.deepEqual(cleanSynopsis(input), ['First paragraph.', 'Second paragraph.']);
});

test('buildTypesenseSearchParams creates proper Atsumaru search filters', () => {
  const params = buildTypesenseSearchParams({
    q: 'Solo Leveling',
    format: 'Manhwa',
    genreId: '39',
    sort: 'relevance',
    page: 2,
    perPage: 24,
  });
  assert.equal(params.get('q'), 'Solo Leveling');
  assert.equal(params.get('page'), '2');
  assert.equal(params.get('infix'), 'off,off,fallback,off,off');
  const filterBy = params.get('filter_by') || '';
  assert.match(filterBy, /type:=\[`Manwha`,`Manhwa`\]/);
  assert.match(filterBy, /genreIds:=`39`/);
  assert.match(filterBy, /isAdult:=false/);
});

test('normalizeSearchDocument normalizes Typesense hit fields', () => {
  const item = normalizeSearchDocument({
    id: 'oZOG5',
    title: 'Solo Leveling',
    type: 'Manwha',
    poster: '/static/posters/cGoOe70KFmmEBe4m.jpg',
    mbRating: 8.614,
    views: 42100000,
    authors: ['Chu-Gong'],
  });
  assert.equal(item.id, 'oZOG5');
  assert.equal(item.format, 'Manhwa');
  assert.equal(item.rating, 8.6);
  assert.equal(item.viewsLabel, '42.1M');
  assert.equal(item.posterUrl, '/api/media?path=posters%2FcGoOe70KFmmEBe4m.jpg');
});

test('filterAndSortChapters and findAdjacentChapters navigate cleanly across chapters', () => {
  const chapters: ChapterItem[] = [
    { id: 'c2-a', scanlationMangaId: 'asura', title: 'Chapter 2', number: 2, index: 2 },
    { id: 'c1-a', scanlationMangaId: 'asura', title: 'Chapter 1', number: 1, index: 1 },
    { id: 'c3-a', scanlationMangaId: 'asura', title: 'Chapter 3', number: 3, index: 3 },
    { id: 'c2-b', scanlationMangaId: 'flame', title: 'Chapter 2', number: 2, index: 2 },
  ];

  const asc = filterAndSortChapters(chapters, { scanlatorId: 'asura', sort: 'asc' });
  assert.deepEqual(
    asc.map((c) => c.id),
    ['c1-a', 'c2-a', 'c3-a']
  );

  const nav = findAdjacentChapters(chapters, 'c2-a', 'asura');
  assert.equal(nav.prev?.id, 'c1-a');
  assert.equal(nav.next?.id, 'c3-a');
});
