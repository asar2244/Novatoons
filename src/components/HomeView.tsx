import { useEffect, useState, type FormEvent } from 'react';
import { ArrowRight, Search } from 'lucide-react';
import { fetchHomeShelf } from '../services/api';
import type {
  MangaSummary,
  ReadingProgress,
  SeriesFormat,
  ShelfKind,
} from '../types/manga';
import { CoverImage } from './CoverImage';
import { MangaCard } from './MangaCard';

interface HomeViewProps {
  onSearchSubmit: (query: string) => void;
  onSelectManga: (id: string) => void;
  onResumeChapter: (manga: MangaSummary, chapterId: string) => void;
  onBrowseAll: (format?: SeriesFormat) => void;
  history: ReadingProgress[];
}

const SHELF_TABS: Array<{ id: ShelfKind; label: string }> = [
  { id: 'popular', label: 'Popular Now' },
  { id: 'hotUpdates', label: 'Hot Updates' },
  { id: 'topRated', label: 'Top Rated' },
  { id: 'rising', label: 'Rising' },
  { id: 'hiddenGems', label: 'Hidden Gems' },
  { id: 'recentlyAdded', label: 'Recently Added' },
];

const FORMAT_OPTIONS: SeriesFormat[] = ['All', 'Manhwa', 'Manga', 'Manhua'];

const QUICK_SEARCH_TERMS = [
  'Solo Leveling',
  'Witch Hat Atelier',
  'Omniscient Reader',
  'Berserk',
  'The Greatest Estate Developer',
];

export function HomeView({
  onSearchSubmit,
  onSelectManga,
  onResumeChapter,
  onBrowseAll,
  history,
}: HomeViewProps) {
  const [heroQuery, setHeroQuery] = useState('');
  const [activeShelf, setActiveShelf] = useState<ShelfKind>('popular');
  const [formatFilter, setFormatFilter] = useState<SeriesFormat>('All');
  const [items, setItems] = useState<MangaSummary[]>([]);
  const [spotlight, setSpotlight] = useState<MangaSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetchHomeShelf(activeShelf, formatFilter, 18, controller.signal)
      .then((list) => {
        setItems(list);
        if (activeShelf === 'popular' && formatFilter === 'All' && list.length > 0) {
          setSpotlight(list[0]);
        } else if (!spotlight && list.length > 0) {
          setSpotlight(list[0]);
        }
        setLoading(false);
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Could not load catalog');
        setLoading(false);
      });

    return () => controller.abort();
  }, [activeShelf, formatFilter, reloadTick]);

  function handleFormSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = heroQuery.trim();
    if (!trimmed) {
      onBrowseAll('All');
      return;
    }
    onSearchSubmit(trimmed);
  }

  return (
    <main className="mx-auto max-w-7xl px-4 pb-20 pt-8 sm:px-6 lg:px-8 lg:pt-12">
      {/* Section 1: Editorial Broadsheet Hero + Spotlight */}
      <section className="grid grid-cols-1 items-stretch gap-10 border-b border-rule pb-12 lg:grid-cols-12 lg:gap-12">
        <div className="flex flex-col justify-between lg:col-span-7">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-seal">
              Manga &amp; Manhwa Reading Room
            </p>
            <h1 className="mt-3 max-w-2xl font-serif text-4xl font-medium leading-[1.12] tracking-tight text-ink text-balance sm:text-5xl">
              Stories drawn in ink, bound for quiet reading.
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-ink-muted">
              Search over 33,000 manga, manhwa, and manhua editions indexed live from Atsumaru.
              Open any title and read chapter by chapter without clutter.
            </p>

            {/* Primary Live Search Form */}
            <form onSubmit={handleFormSubmit} className="mt-7 max-w-xl">
              <label htmlFor="hero-catalog-search" className="sr-only">
                Search manga and manhwa on Atsumaru
              </label>
              <div className="flex items-stretch gap-2">
                <div className="relative flex-1">
                  <Search
                    className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
                    strokeWidth={1.75}
                  />
                  <input
                    id="hero-catalog-search"
                    type="search"
                    value={heroQuery}
                    onChange={(e) => setHeroQuery(e.target.value)}
                    placeholder="Search title or author (e.g. Solo Leveling, Vagabond)..."
                    className="h-12 w-full rounded-md border border-rule bg-white pl-10 pr-4 text-sm text-ink placeholder:text-ink-muted/70 focus:border-ink focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="inline-flex h-12 items-center justify-center rounded-md bg-seal px-6 text-sm font-medium text-white transition-colors duration-150 hover:bg-seal-hover whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-seal"
                >
                  Search
                </button>
              </div>
            </form>

            {/* Quick Title Links (unboxed editorial text links) */}
            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-ink-muted">
              <span className="font-medium text-ink">Popular searches:</span>
              {QUICK_SEARCH_TERMS.map((term, index) => (
                <span key={term} className="inline-flex items-center gap-3">
                  {index > 0 && (
                    <span aria-hidden="true" className="hidden sm:inline text-rule">
                      /
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => onSearchSubmit(term)}
                    className="underline decoration-rule underline-offset-4 transition-colors hover:text-seal hover:decoration-seal"
                  >
                    {term}
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-1.5 border-t border-rule/80 pt-5 text-xs text-ink-muted tabular-nums">
            <span>
              <strong className="font-semibold text-ink">33,000+</strong> indexed series
            </span>
            <span aria-hidden="true" className="hidden sm:inline text-rule">
              ·
            </span>
            <span>
              <strong className="font-semibold text-ink">Manga, Manhwa &amp; Manhua</strong>
            </span>
            <span aria-hidden="true" className="hidden sm:inline text-rule">
              ·
            </span>
            <span>Live catalog linked to Atsumaru</span>
          </div>
        </div>

        {/* Right Column: Lead Edition Spotlight */}
        <div className="lg:col-span-5">
          {spotlight ? (
            <div className="flex h-full flex-col justify-between rounded-md border border-rule bg-white p-5 sm:p-6">
              <div className="flex items-center justify-between border-b border-rule/80 pb-3 text-xs text-ink-muted">
                <span className="font-semibold uppercase tracking-[0.12em] text-ink">
                  Featured Edition · No. 01
                </span>
                <span className="tabular-nums">
                  {spotlight.format}
                  {spotlight.rating != null ? ` · ★ ${spotlight.rating.toFixed(1)}` : ''}
                </span>
              </div>

              <div className="my-5 flex gap-5">
                <button
                  type="button"
                  onClick={() => onSelectManga(spotlight.id)}
                  className="w-32 shrink-0 sm:w-36 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-seal"
                >
                  <CoverImage
                    src={spotlight.posterUrl}
                    alt={spotlight.title}
                    priority
                    className="rounded-sm"
                  />
                </button>
                <div className="flex min-w-0 flex-1 flex-col justify-between">
                  <div>
                    <h2 className="font-serif text-2xl font-medium leading-snug text-ink">
                      {spotlight.title}
                    </h2>
                    <p className="mt-2 text-xs text-ink-muted tabular-nums">
                      {spotlight.viewsLabel} readers · {spotlight.format}
                    </p>
                    <p className="mt-3 text-sm leading-relaxed text-ink-muted">
                      Currently leading the Atsumaru reading charts. Open the series index to
                      browse available chapters and read immediately.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-rule/80 pt-4">
                <button
                  type="button"
                  onClick={() => onSelectManga(spotlight.id)}
                  className="inline-flex items-center gap-2 rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper transition-colors duration-150 hover:bg-seal whitespace-nowrap shrink-0"
                >
                  <span>Inspect Series</span>
                  <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
                </button>
                <button
                  type="button"
                  onClick={() => onBrowseAll('Manhwa')}
                  className="text-xs font-medium text-ink-muted underline decoration-rule underline-offset-4 hover:text-ink whitespace-nowrap shrink-0"
                >
                  Explore Manhwa
                </button>
              </div>
            </div>
          ) : (
            <div className="flex h-full min-h-[280px] flex-col justify-between rounded-md border border-rule bg-white p-5 sm:p-6">
              <div className="h-4 w-40 animate-pulse rounded bg-linen" />
              <div className="my-5 flex gap-5">
                <div className="aspect-[3/4] w-32 shrink-0 animate-pulse rounded-sm bg-linen sm:w-36" />
                <div className="flex-1 space-y-3">
                  <div className="h-6 w-3/4 animate-pulse rounded bg-linen" />
                  <div className="h-3 w-1/2 animate-pulse rounded bg-linen" />
                  <div className="h-16 w-full animate-pulse rounded bg-linen" />
                </div>
              </div>
              <div className="h-9 w-36 animate-pulse rounded-md bg-linen" />
            </div>
          )}
        </div>
      </section>

      {/* Optional Continue Reading Strip (only when user has reading history) */}
      {history.length > 0 && (
        <section className="border-b border-rule py-8">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="font-serif text-xl font-medium text-ink">Continue Reading</h2>
            <span className="text-xs text-ink-muted tabular-nums">
              {history.length} recent {history.length === 1 ? 'title' : 'titles'}
            </span>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {history.slice(0, 4).map((entry) => (
              <div
                key={entry.manga.id}
                className="flex items-center gap-3.5 rounded-md border border-rule bg-white p-3"
              >
                <button
                  type="button"
                  onClick={() => onSelectManga(entry.manga.id)}
                  className="w-14 shrink-0"
                >
                  <CoverImage
                    src={entry.manga.posterUrl}
                    alt={entry.manga.title}
                    className="rounded-sm"
                  />
                </button>
                <div className="min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => onSelectManga(entry.manga.id)}
                    className="line-clamp-1 text-left text-sm font-semibold text-ink hover:text-seal"
                  >
                    {entry.manga.title}
                  </button>
                  <p className="mt-0.5 truncate text-xs text-ink-muted tabular-nums">
                    {entry.chapterTitle || `Chapter ${entry.chapterNumber}`}
                  </p>
                  <button
                    type="button"
                    onClick={() => onResumeChapter(entry.manga, entry.chapterId)}
                    className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-seal hover:underline"
                  >
                    <span>Resume chapter</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Section 2: Curated Catalog Shelf */}
      <section className="pt-10">
        <div className="flex flex-col gap-4 border-b border-rule pb-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-serif text-2xl font-medium text-ink">Catalog Index</h2>
            <p className="mt-1 text-sm text-ink-muted">
              Live editions curated directly from Atsumaru.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Format Segmented Filter */}
            <div
              role="group"
              aria-label="Filter shelf by format"
              className="inline-flex items-center gap-1 rounded-md bg-linen p-1"
            >
              {FORMAT_OPTIONS.map((fmt) => {
                const active = formatFilter === fmt;
                return (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => setFormatFilter(fmt)}
                    className={`rounded px-3 py-1.5 text-xs font-medium transition-colors duration-150 whitespace-nowrap shrink-0 ${
                      active
                        ? 'bg-white text-ink shadow-xs'
                        : 'text-ink-muted hover:text-ink'
                    }`}
                  >
                    {fmt}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Shelf Tabs */}
        <div
          role="tablist"
          aria-label="Catalog shelves"
          className="mt-4 flex items-center gap-2 overflow-x-auto pb-2"
        >
          {SHELF_TABS.map((tab) => {
            const active = activeShelf === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                type="button"
                aria-selected={active}
                onClick={() => setActiveShelf(tab.id)}
                className={`rounded-md border px-3.5 py-1.5 text-xs font-medium transition-colors duration-150 whitespace-nowrap shrink-0 ${
                  active
                    ? 'border-ink bg-ink text-paper'
                    : 'border-rule bg-white text-ink-muted hover:border-ink-muted hover:text-ink'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Shelf Content States */}
        {loading ? (
          <div
            aria-busy="true"
            className="mt-7 grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6"
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
          <div className="mt-8 rounded-md border border-rule bg-white p-8 text-center">
            <p className="font-serif text-lg text-ink">Unable to reach Atsumaru catalog</p>
            <p className="mt-1 text-sm text-ink-muted">{error}</p>
            <button
              type="button"
              onClick={() => setReloadTick((n) => n + 1)}
              className="mt-4 rounded-md bg-seal px-4 py-2 text-sm font-medium text-white hover:bg-seal-hover"
            >
              Try Again
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="mt-8 rounded-md border border-rule bg-white p-8 text-center">
            <p className="font-serif text-lg text-ink">No titles found in this shelf</p>
            <button
              type="button"
              onClick={() => setFormatFilter('All')}
              className="mt-4 rounded-md border border-rule px-4 py-2 text-sm font-medium text-ink hover:bg-linen"
            >
              Reset Format Filter
            </button>
          </div>
        ) : (
          <div
            data-testid="home-catalog-grid"
            className="mt-7 grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6"
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
        )}

        <div className="mt-12 flex justify-center border-t border-rule pt-8">
          <button
            type="button"
            onClick={() => onBrowseAll(formatFilter)}
            className="inline-flex items-center gap-2 rounded-md border border-ink px-6 py-2.5 text-sm font-medium text-ink transition-colors duration-150 hover:bg-ink hover:text-paper"
          >
            <span>Browse Full Atsumaru Archive</span>
            <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>
      </section>
    </main>
  );
}
