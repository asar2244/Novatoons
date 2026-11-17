import { useEffect, useState, type FormEvent } from 'react';
import { ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import { fetchGenres, searchCatalog } from '../services/api';
import type {
  GenreTag,
  MangaSummary,
  SeriesFormat,
  SortOption,
} from '../types/manga';
import { MangaCard } from './MangaCard';

interface BrowseViewProps {
  query: string;
  format: SeriesFormat;
  genreId: string;
  status: string;
  sort: SortOption;
  page: number;
  onUpdateParams: (next: {
    query?: string;
    format?: SeriesFormat;
    genreId?: string;
    status?: string;
    sort?: SortOption;
    page?: number;
  }) => void;
  onSelectManga: (id: string) => void;
  autoFocusSearch?: boolean;
}

const FORMATS: SeriesFormat[] = ['All', 'Manhwa', 'Manga', 'Manhua', 'OEL'];

export function BrowseView({
  query,
  format,
  genreId,
  status,
  sort,
  page,
  onUpdateParams,
  onSelectManga,
  autoFocusSearch = false,
}: BrowseViewProps) {
  const [inputValue, setInputValue] = useState(query);
  const [genres, setGenres] = useState<GenreTag[]>([]);
  const [items, setItems] = useState<MangaSummary[]>([]);
  const [found, setFound] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryTick, setRetryTick] = useState(0);

  useEffect(() => {
    setInputValue(query);
  }, [query]);

  useEffect(() => {
    const controller = new AbortController();
    fetchGenres(controller.signal)
      .then(setGenres)
      .catch(() => {
        // Non-fatal if genres fail to load
      });
    return () => controller.abort();
  }, []);

  // Debounce live search when typing
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (inputValue !== query) {
        onUpdateParams({ query: inputValue, page: 1 });
      }
    }, 320);
    return () => window.clearTimeout(timer);
  }, [inputValue, query, onUpdateParams]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    searchCatalog(
      {
        q: query,
        format,
        genreId: genreId || undefined,
        status: status || undefined,
        sort,
        page,
        perPage: 24,
      },
      controller.signal
    )
      .then((res) => {
        setItems(res.items);
        setFound(res.found);
        setTotalPages(res.totalPages);
        setLoading(false);
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Search failed');
        setLoading(false);
      });

    return () => controller.abort();
  }, [query, format, genreId, status, sort, page, retryTick]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onUpdateParams({ query: inputValue.trim(), page: 1 });
  }

  function handleResetFilters() {
    setInputValue('');
    onUpdateParams({
      query: '',
      format: 'All',
      genreId: '',
      status: '',
      sort: 'relevance',
      page: 1,
    });
  }

  const activeGenreName = genres.find((g) => g.id === genreId)?.name;

  return (
    <main className="mx-auto max-w-7xl px-4 pb-20 pt-8 sm:px-6 lg:px-8">
      {/* Header & Live Search Input */}
      <div className="border-b border-rule pb-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-seal">
              Atsumaru Live Archive
            </p>
            <h1 className="mt-1.5 font-serif text-3xl font-medium text-ink">
              {query.trim()
                ? `Search results for “${query.trim()}”`
                : format !== 'All'
                ? `${format} Directory`
                : activeGenreName
                ? `${activeGenreName} Collection`
                : 'Browse Manga & Manhwa'}
            </h1>
          </div>

          <p className="text-sm text-ink-muted tabular-nums">
            {loading
              ? 'Searching Atsumaru...'
              : `${found.toLocaleString()} ${found === 1 ? 'series' : 'series'} found`}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3 sm:flex-row">
          <label htmlFor="browse-search-input" className="sr-only">
            Search manga and manhwa titles or authors
          </label>
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
              strokeWidth={1.75}
            />
            <input
              id="browse-search-input"
              type="search"
              autoFocus={autoFocusSearch}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Search any manga, manhwa, manhua, or author on Atsumaru..."
              className="h-11 w-full rounded-md border border-rule bg-white pl-10 pr-10 text-sm text-ink placeholder:text-ink-muted/70 focus:border-ink focus:outline-none"
            />
            {inputValue && (
              <button
                type="button"
                aria-label="Clear search query"
                onClick={() => {
                  setInputValue('');
                  onUpdateParams({ query: '', page: 1 });
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-ink-muted hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <button
            type="submit"
            className="h-11 rounded-md bg-seal px-6 text-sm font-medium text-white transition-colors duration-150 hover:bg-seal-hover whitespace-nowrap shrink-0"
          >
            Search
          </button>
        </form>

        {/* Filter Bar */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
          <div
            role="group"
            aria-label="Format filter"
            className="inline-flex flex-wrap items-center gap-1 rounded-md bg-linen p-1"
          >
            {FORMATS.map((fmt) => {
              const active = format === fmt;
              return (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => onUpdateParams({ format: fmt, page: 1 })}
                  className={`rounded px-3 py-1.5 text-xs font-medium transition-colors duration-150 whitespace-nowrap shrink-0 ${
                    active ? 'bg-white text-ink shadow-xs' : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  {fmt}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div>
              <label htmlFor="filter-genre" className="sr-only">
                Filter by genre
              </label>
              <select
                id="filter-genre"
                value={genreId}
                onChange={(e) => onUpdateParams({ genreId: e.target.value, page: 1 })}
                className="h-9 rounded-md border border-rule bg-white px-3 text-xs font-medium text-ink focus:border-ink focus:outline-none"
              >
                <option value="">All Genres</option>
                {genres.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="filter-status" className="sr-only">
                Filter by publication status
              </label>
              <select
                id="filter-status"
                value={status}
                onChange={(e) => onUpdateParams({ status: e.target.value, page: 1 })}
                className="h-9 rounded-md border border-rule bg-white px-3 text-xs font-medium text-ink focus:border-ink focus:outline-none"
              >
                <option value="">All Status</option>
                <option value="Ongoing">Ongoing</option>
                <option value="Completed">Completed</option>
                <option value="Hiatus">Hiatus</option>
              </select>
            </div>

            <div>
              <label htmlFor="filter-sort" className="sr-only">
                Sort results
              </label>
              <select
                id="filter-sort"
                value={sort}
                onChange={(e) => onUpdateParams({ sort: e.target.value as SortOption, page: 1 })}
                className="h-9 rounded-md border border-rule bg-white px-3 text-xs font-medium text-ink focus:border-ink focus:outline-none"
              >
                <option value="relevance">Sort: Relevance</option>
                <option value="views">Sort: Most Popular</option>
                <option value="rating">Sort: Top Rated</option>
                <option value="recent">Sort: Recently Added</option>
                <option value="title">Sort: Title A–Z</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Results Area */}
      {loading ? (
        <div
          aria-busy="true"
          className="mt-8 grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6"
        >
          {Array.from({ length: 12 }).map((_, idx) => (
            <div key={idx} className="flex flex-col gap-2.5">
              <div className="aspect-[3/4] w-full animate-pulse rounded-sm border border-rule bg-linen" />
              <div className="h-4 w-4/5 animate-pulse rounded bg-linen" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-linen" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="mt-10 rounded-md border border-rule bg-white p-10 text-center">
          <p className="font-serif text-xl text-ink">Search temporarily unavailable</p>
          <p className="mt-1.5 text-sm text-ink-muted">{error}</p>
          <button
            type="button"
            onClick={() => setRetryTick((n) => n + 1)}
            className="mt-5 rounded-md bg-seal px-5 py-2 text-sm font-medium text-white hover:bg-seal-hover"
          >
            Retry Search
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="mt-10 rounded-md border border-rule bg-white p-12 text-center">
          <p className="font-serif text-xl text-ink">No matching manga or manhwa found</p>
          <p className="mt-2 text-sm text-ink-muted">
            Try a different title spelling, or clear active format and genre filters.
          </p>
          <button
            type="button"
            onClick={handleResetFilters}
            className="mt-5 rounded-md border border-ink px-5 py-2 text-sm font-medium text-ink hover:bg-ink hover:text-paper"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <>
          <div
            data-testid="browse-results-grid"
            className="mt-8 grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6"
          >
            {items.map((item, idx) => (
              <MangaCard
                key={item.id}
                item={item}
                onSelect={onSelectManga}
                priority={idx < 6}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <nav
              aria-label="Search results pagination"
              className="mt-12 flex items-center justify-between border-t border-rule pt-6"
            >
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => {
                  onUpdateParams({ page: page - 1 });
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="inline-flex items-center gap-1.5 rounded-md border border-rule bg-white px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-linen disabled:cursor-not-allowed disabled:opacity-45"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Previous</span>
              </button>

              <span className="text-sm text-ink-muted tabular-nums">
                Page <strong className="font-semibold text-ink">{page}</strong> of{' '}
                {totalPages.toLocaleString()}
              </span>

              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => {
                  onUpdateParams({ page: page + 1 });
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="inline-flex items-center gap-1.5 rounded-md border border-rule bg-white px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-linen disabled:cursor-not-allowed disabled:opacity-45"
              >
                <span>Next</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </nav>
          )}
        </>
      )}
    </main>
  );
}
