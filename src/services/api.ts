import type {
  ChapterItem,
  ChapterReadData,
  GenreTag,
  MangaDetail,
  MangaSummary,
  SearchResponse,
  SeriesFormat,
  ShelfKind,
  SortOption,
} from '../types/manga';

async function requestJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal });
  const contentType = response.headers.get('content-type') || '';
  const text = await response.text();

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    if (contentType.includes('application/json')) {
      try {
        const parsed = JSON.parse(text) as { error?: string };
        if (parsed.error) message = parsed.error;
      } catch {
        // Use default status message
      }
    }
    throw new Error(message);
  }

  if (!contentType.includes('application/json') && text.trimStart().startsWith('<')) {
    throw new Error('Catalog API returned HTML instead of JSON. Please retry.');
  }

  return JSON.parse(text) as T;
}

export async function fetchHomeShelf(
  shelf: ShelfKind,
  format: SeriesFormat,
  limit = 18,
  signal?: AbortSignal
): Promise<MangaSummary[]> {
  const params = new URLSearchParams({
    shelf,
    format,
    limit: String(limit),
  });
  const data = await requestJson<{ items: MangaSummary[] }>(
    `/api/home?${params.toString()}`,
    signal
  );
  return data.items;
}

export async function fetchGenres(signal?: AbortSignal): Promise<GenreTag[]> {
  const data = await requestJson<{ genres: GenreTag[] }>('/api/genres', signal);
  return data.genres;
}

export interface SearchRequestParams {
  q?: string;
  format?: SeriesFormat;
  genreId?: string;
  status?: string;
  sort?: SortOption;
  page?: number;
  perPage?: number;
}

export async function searchCatalog(
  params: SearchRequestParams,
  signal?: AbortSignal
): Promise<SearchResponse> {
  const qs = new URLSearchParams();
  if (params.q) qs.set('q', params.q);
  if (params.format && params.format !== 'All') qs.set('format', params.format);
  if (params.genreId) qs.set('genreId', params.genreId);
  if (params.status) qs.set('status', params.status);
  if (params.sort) qs.set('sort', params.sort);
  if (params.page) qs.set('page', String(params.page));
  if (params.perPage) qs.set('perPage', String(params.perPage));

  return requestJson<SearchResponse>(`/api/search?${qs.toString()}`, signal);
}

export async function fetchMangaDetail(
  id: string,
  signal?: AbortSignal
): Promise<{ manga: MangaDetail; chapters: ChapterItem[] }> {
  return requestJson<{ manga: MangaDetail; chapters: ChapterItem[] }>(
    `/api/manga/${encodeURIComponent(id)}`,
    signal
  );
}

export async function fetchChapterPages(
  mangaId: string,
  chapterId: string,
  signal?: AbortSignal
): Promise<ChapterReadData> {
  const params = new URLSearchParams({ mangaId, chapterId });
  const data = await requestJson<{ chapter: ChapterReadData }>(
    `/api/read?${params.toString()}`,
    signal
  );
  return data.chapter;
}
