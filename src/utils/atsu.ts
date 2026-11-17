import type {
  ChapterItem,
  MangaSummary,
  SeriesFormat,
  SortOption,
} from '../types/manga';

const ATSU_STATIC_PREFIXES = [
  'https://cdn.atsu.moe/static/',
  'https://atsu.moe/static/',
  '/static/',
];

export function normalizeFormat(raw?: string | null): string {
  if (!raw) return 'Manga';
  if (raw === 'Manwha') return 'Manhwa';
  return raw;
}

export function normalizeStaticPath(raw?: string | null): string {
  if (!raw) return '';
  let trimmed = raw.trim();
  for (const prefix of ATSU_STATIC_PREFIXES) {
    if (trimmed.startsWith(prefix)) {
      trimmed = trimmed.slice(prefix.length);
      break;
    }
  }
  return trimmed.replace(/^\/+/, '');
}

export function isSafeStaticPath(path: string): boolean {
  if (!path || path.includes('..') || path.includes('://') || path.startsWith('/')) {
    return false;
  }
  return /^[a-zA-Z0-9/_.-]+$/.test(path);
}

export function buildMediaProxyUrl(raw?: string | null): string {
  const normalized = normalizeStaticPath(raw);
  if (!normalized || !isSafeStaticPath(normalized)) return '';
  return `/api/media?path=${encodeURIComponent(normalized)}`;
}

export function formatViews(views?: number | string | null): string {
  if (views == null) return '—';
  if (typeof views === 'string') {
    const trimmed = views.trim();
    if (!trimmed) return '—';
    const num = Number(trimmed);
    if (Number.isNaN(num)) return trimmed;
    return formatViews(num);
  }
  if (!Number.isFinite(views) || views <= 0) return '—';
  if (views >= 1_000_000) {
    return `${(views / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  }
  if (views >= 1_000) {
    return `${(views / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  }
  return String(Math.round(views));
}

export function formatRating(rating?: number | null): number | null {
  if (rating == null || !Number.isFinite(rating) || rating <= 0) return null;
  return Math.round(rating * 10) / 10;
}

export function cleanSynopsis(raw?: string | null): string[] {
  if (!raw) return [];
  const withoutSources = raw
    .replace(/\*Source:[^*]*\*/gi, '')
    .replace(/\r\n/g, '\n');

  const chunks = withoutSources
    .split(/\n+---\n+|\n{2,}/)
    .map((part) => part.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim())
    .filter((part) => part.length > 0);

  return chunks;
}

export function formatTypesForAtsuQuery(format: SeriesFormat): string[] | undefined {
  switch (format) {
    case 'Manhwa':
      return ['Manwha', 'Manhwa'];
    case 'Manga':
      return ['Manga'];
    case 'Manhua':
      return ['Manhua'];
    case 'OEL':
      return ['OEL'];
    default:
      return undefined;
  }
}

export interface SearchQueryOptions {
  q?: string;
  format?: SeriesFormat;
  genreId?: string;
  status?: string;
  sort?: SortOption;
  page?: number;
  perPage?: number;
}

export function buildTypesenseSearchParams(opts: SearchQueryOptions): URLSearchParams {
  const q = (opts.q ?? '').trim();
  const hasSearch = q.length > 0;
  const format = opts.format ?? 'All';
  const page = Math.max(1, opts.page ?? 1);
  const perPage = Math.min(48, Math.max(1, opts.perPage ?? 24));

  const filters: string[] = [
    'isAdult:=false',
    'hidden:!=true',
    'mbContentRating:=[`Safe`,`Suggestive`]',
  ];

  const types = formatTypesForAtsuQuery(format);
  if (types && types.length > 0) {
    filters.push(`type:=[${types.map((t) => `\`${t}\``).join(',')}]`);
  }

  if (opts.genreId && /^[0-9]+$/.test(opts.genreId)) {
    filters.push(`genreIds:=\`${opts.genreId}\``);
  }

  if (opts.status && ['Ongoing', 'Completed', 'Hiatus', 'Canceled'].includes(opts.status)) {
    filters.push(`status:=[\`${opts.status}\`]`);
  }

  const sortMap: Record<SortOption, string> = {
    relevance: hasSearch ? '_text_match:desc,views:desc' : 'views:desc',
    views: 'views:desc',
    rating: 'mbRating:desc,views:desc',
    recent: 'dateAdded:desc',
    title: 'title:asc',
  };

  if (opts.sort === 'rating') {
    filters.push('mbRating:>0');
  }

  const params = new URLSearchParams({
    q: hasSearch ? q : '*',
    query_by: 'title,englishTitle,otherNames,authors,acronyms',
    query_by_weights: '4,3,2,2,1',
    num_typos: '4,3,2,1,0',
    prefix: 'true,true,true,true,false',
    include_fields:
      'id,title,englishTitle,authors,poster,posterSmall,posterMedium,type,medium,isAdult,status,year,mbRating,views,popularity,dateAdded,chapterCount',
    filter_by: filters.join(' && '),
    sort_by: sortMap[opts.sort ?? 'relevance'],
    page: String(page),
    per_page: String(perPage),
  });

  if (hasSearch) {
    params.set('infix', 'off,off,fallback,off,off');
  }

  return params;
}

export function normalizeHomeItem(raw: Record<string, unknown>): MangaSummary {
  const posterRaw =
    (raw.mediumImage as string | undefined) ||
    (raw.image as string | undefined) ||
    (raw.smallImage as string | undefined) ||
    '';
  const posterPath = normalizeStaticPath(posterRaw);
  return {
    id: String(raw.id ?? ''),
    title: String(raw.title ?? 'Untitled'),
    englishTitle: typeof raw.englishTitle === 'string' ? raw.englishTitle : null,
    authors: Array.isArray(raw.authors) ? raw.authors.map(String) : [],
    format: normalizeFormat(typeof raw.type === 'string' ? raw.type : undefined),
    status: typeof raw.status === 'string' ? raw.status : undefined,
    rating: formatRating(typeof raw.mbRating === 'number' ? raw.mbRating : null),
    viewsLabel: formatViews(raw.views as number | string | null | undefined),
    viewsCount: typeof raw.views === 'number' ? raw.views : undefined,
    chapterCount: typeof raw.chapterCount === 'number' ? raw.chapterCount : undefined,
    posterPath,
    posterUrl: buildMediaProxyUrl(posterPath),
    year: typeof raw.year === 'number' ? raw.year : null,
  };
}

export function normalizeSearchDocument(doc: Record<string, unknown>): MangaSummary {
  const posterRaw =
    (doc.posterMedium as string | undefined) ||
    (doc.poster as string | undefined) ||
    (doc.posterSmall as string | undefined) ||
    '';
  const posterPath = normalizeStaticPath(posterRaw);
  return {
    id: String(doc.id ?? ''),
    title: String(doc.title ?? 'Untitled'),
    englishTitle: typeof doc.englishTitle === 'string' ? doc.englishTitle : null,
    authors: Array.isArray(doc.authors) ? doc.authors.map(String) : [],
    format: normalizeFormat(typeof doc.type === 'string' ? doc.type : undefined),
    status: typeof doc.status === 'string' ? doc.status : undefined,
    rating: formatRating(typeof doc.mbRating === 'number' ? doc.mbRating : null),
    viewsLabel: formatViews(
      (doc.views as number | string | undefined) ??
        (doc.popularity as number | string | undefined)
    ),
    viewsCount: typeof doc.views === 'number' ? doc.views : undefined,
    chapterCount: typeof doc.chapterCount === 'number' ? doc.chapterCount : undefined,
    posterPath,
    posterUrl: buildMediaProxyUrl(posterPath),
    year: typeof doc.year === 'number' ? doc.year : null,
  };
}

export interface ChapterFilterOptions {
  scanlatorId?: string;
  query?: string;
  sort?: 'asc' | 'desc';
}

export function filterAndSortChapters(
  chapters: ChapterItem[],
  opts: ChapterFilterOptions
): ChapterItem[] {
  const scanlatorId = opts.scanlatorId ?? 'all';
  const query = (opts.query ?? '').trim().toLowerCase();
  const sort = opts.sort ?? 'desc';

  const filtered = chapters.filter((ch) => {
    if (scanlatorId !== 'all' && ch.scanlationMangaId && ch.scanlationMangaId !== scanlatorId) {
      return false;
    }
    if (query) {
      const numStr = String(ch.number);
      return (
        ch.title.toLowerCase().includes(query) ||
        numStr.includes(query)
      );
    }
    return true;
  });

  return [...filtered].sort((a, b) => {
    const diff = a.number - b.number || a.index - b.index;
    return sort === 'asc' ? diff : -diff;
  });
}

export function findAdjacentChapters(
  chapters: ChapterItem[],
  currentChapterId: string,
  preferredScanlatorId?: string
): { prev: ChapterItem | null; next: ChapterItem | null } {
  if (chapters.length === 0) return { prev: null, next: null };

  const current = chapters.find((c) => c.id === currentChapterId);
  const activeScanlator = preferredScanlatorId || current?.scanlationMangaId;

  const sameSource = activeScanlator
    ? chapters.filter((c) => c.scanlationMangaId === activeScanlator)
    : [];
  const pool = sameSource.length > 1 ? sameSource : chapters;

  const orderedAsc = [...pool].sort(
    (a, b) => a.number - b.number || a.index - b.index
  );

  // Deduplicate by chapter number when mixing sources so Next Chapter advances cleanly
  const deduped: ChapterItem[] = [];
  for (const ch of orderedAsc) {
    const existingIdx = deduped.findIndex((item) => item.number === ch.number);
    if (existingIdx === -1) {
      deduped.push(ch);
    } else if (ch.id === currentChapterId) {
      deduped[existingIdx] = ch;
    }
  }

  const idx = deduped.findIndex((c) => c.id === currentChapterId);
  if (idx === -1) {
    return { prev: null, next: null };
  }

  return {
    prev: idx > 0 ? deduped[idx - 1] : null,
    next: idx < deduped.length - 1 ? deduped[idx + 1] : null,
  };
}
