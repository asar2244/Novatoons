import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Columns2,
  ScrollText,
} from 'lucide-react';
import { fetchChapterPages, fetchMangaDetail } from '../services/api';
import type {
  ChapterItem,
  ChapterPage,
  ChapterReadData,
  MangaSummary,
} from '../types/manga';
import { filterAndSortChapters, findAdjacentChapters } from '../utils/atsu';

interface ReaderViewProps {
  mangaId: string;
  chapterId: string;
  initialManga?: MangaSummary | null;
  initialChapters?: ChapterItem[];
  onBackToSeries: (mangaId: string) => void;
  onNavigateChapter: (chapter: ChapterItem) => void;
  onChapterLoaded: (manga: MangaSummary, chapter: ChapterItem) => void;
}

type ReaderSurface = 'paper' | 'sepia' | 'ink';
type ReaderMode = 'strip' | 'page';
type ReaderWidth = 'comfortable' | 'wide' | 'full';

const SURFACE_CLASSES: Record<ReaderSurface, string> = {
  paper: 'bg-paper text-ink',
  sepia: 'bg-[#EDE4D3] text-[#241E18]',
  ink: 'bg-[#171615] text-[#EDEAE4]',
};

const WIDTH_CLASSES: Record<ReaderWidth, string> = {
  comfortable: 'max-w-3xl',
  wide: 'max-w-5xl',
  full: 'max-w-none px-2 sm:px-6',
};

function ReaderPageImage({
  page,
  surface,
}: {
  page: ChapterPage;
  surface: ReaderSurface;
}) {
  const [failed, setFailed] = useState(false);

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{
        aspectRatio:
          page.width && page.height ? `${page.width} / ${page.height}` : undefined,
      }}
    >
      {failed ? (
        <div
          className={`flex min-h-[260px] flex-col items-center justify-center border border-rule/40 p-6 text-center text-sm ${
            surface === 'ink' ? 'bg-[#22201E] text-[#B8B2A6]' : 'bg-linen text-ink-muted'
          }`}
        >
          <p>Page {page.number + 1} failed to load.</p>
          <button
            type="button"
            onClick={() => setFailed(false)}
            className="mt-3 rounded border border-current px-3 py-1 text-xs font-medium"
          >
            Reload Page
          </button>
        </div>
      ) : (
        <img
          src={page.imageUrl}
          alt={`Page ${page.number + 1}`}
          loading={page.number < 3 ? 'eager' : 'lazy'}
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="block h-auto w-full select-none"
        />
      )}
    </div>
  );
}

export function ReaderView({
  mangaId,
  chapterId,
  initialManga,
  initialChapters,
  onBackToSeries,
  onNavigateChapter,
  onChapterLoaded,
}: ReaderViewProps) {
  const [manga, setManga] = useState<MangaSummary | null>(initialManga ?? null);
  const [chapters, setChapters] = useState<ChapterItem[]>(initialChapters ?? []);
  const [readData, setReadData] = useState<ChapterReadData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryTick, setRetryTick] = useState(0);

  const [mode, setMode] = useState<ReaderMode>(() =>
    initialManga?.format === 'Manga' ? 'page' : 'strip'
  );
  const [surface, setSurface] = useState<ReaderSurface>('paper');
  const [widthMode, setWidthMode] = useState<ReaderWidth>('comfortable');
  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  // Ensure series metadata & chapter list exist even when resumed directly from Library
  useEffect(() => {
    if (manga && chapters.length > 0) return;
    const controller = new AbortController();
    fetchMangaDetail(mangaId, controller.signal)
      .then((res) => {
        setManga(res.manga);
        setChapters(res.chapters);
        if (res.manga.format === 'Manga') {
          setMode('page');
        }
      })
      .catch(() => {
        // Non-fatal if metadata fails while pages load
      });
    return () => controller.abort();
  }, [mangaId, manga, chapters.length]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setCurrentPageIndex(0);
    window.scrollTo({ top: 0 });

    fetchChapterPages(mangaId, chapterId, controller.signal)
      .then((data) => {
        setReadData(data);
        setLoading(false);
        if (manga) {
          onChapterLoaded(manga, {
            id: data.id,
            title: data.title,
            number: data.number,
            index: data.number,
            scanlationMangaId: data.scanlationMangaId,
          });
        }
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Unable to load chapter pages');
        setLoading(false);
      });

    return () => controller.abort();
  }, [mangaId, chapterId, retryTick]);

  // Keyboard navigation in Single Page mode
  useEffect(() => {
    if (mode !== 'page' || !readData) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) {
        return;
      }
      if (e.key === 'ArrowRight') {
        setCurrentPageIndex((idx) => Math.min(readData!.pages.length - 1, idx + 1));
      } else if (e.key === 'ArrowLeft') {
        setCurrentPageIndex((idx) => Math.max(0, idx - 1));
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mode, readData]);

  const orderedChapters = useMemo(
    () =>
      filterAndSortChapters(chapters, {
        scanlatorId: readData?.scanlationMangaId || 'all',
        sort: 'asc',
      }),
    [chapters, readData?.scanlationMangaId]
  );

  const adjacent = useMemo(
    () => findAdjacentChapters(chapters, chapterId, readData?.scanlationMangaId),
    [chapters, chapterId, readData?.scanlationMangaId]
  );

  const toolbarBg =
    surface === 'ink'
      ? 'border-[#2E2C28] bg-[#171615]/95 text-[#EDEAE4]'
      : surface === 'sepia'
      ? 'border-[#D9CEBA] bg-[#EDE4D3]/95 text-[#241E18]'
      : 'border-rule bg-paper/95 text-ink';

  return (
    <div className={`min-h-screen transition-colors duration-150 ${SURFACE_CLASSES[surface]}`}>
      {/* Sticky Reader Control Bar */}
      <header className={`sticky top-0 z-30 border-b backdrop-blur-sm ${toolbarBg}`}>
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => onBackToSeries(mangaId)}
              className="inline-flex items-center gap-1.5 rounded border border-current/20 px-2.5 py-1.5 text-xs font-medium hover:bg-current/5 whitespace-nowrap shrink-0"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Series</span>
            </button>
            <div className="min-w-0">
              <p className="truncate font-serif text-sm font-medium">
                {manga?.title || 'Reader'}
              </p>
              <p className="truncate text-xs opacity-70 tabular-nums">
                {readData?.title || 'Loading chapter...'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Chapter Dropdown */}
            {orderedChapters.length > 0 && (
              <div>
                <label htmlFor="reader-chapter-select" className="sr-only">
                  Select chapter
                </label>
                <select
                  id="reader-chapter-select"
                  value={chapterId}
                  onChange={(e) => {
                    const target = chapters.find((c) => c.id === e.target.value);
                    if (target) onNavigateChapter(target);
                  }}
                  className={`h-8 max-w-[170px] rounded border px-2 text-xs font-medium ${
                    surface === 'ink'
                      ? 'border-[#3A3733] bg-[#22201E] text-[#EDEAE4]'
                      : 'border-rule bg-white text-ink'
                  }`}
                >
                  {orderedChapters.map((ch) => (
                    <option key={ch.id} value={ch.id}>
                      {ch.title || `Chapter ${ch.number}`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Mode Toggle */}
            <div
              role="group"
              aria-label="Reading mode"
              className="inline-flex items-center rounded border border-current/20 p-0.5"
            >
              <button
                type="button"
                onClick={() => setMode('strip')}
                title="Vertical Strip"
                className={`inline-flex items-center gap-1 rounded-xs px-2 py-1 text-xs font-medium ${
                  mode === 'strip' ? 'bg-seal text-white' : 'opacity-75 hover:opacity-100'
                }`}
              >
                <ScrollText className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Strip</span>
              </button>
              <button
                type="button"
                onClick={() => setMode('page')}
                title="Single Page"
                className={`inline-flex items-center gap-1 rounded-xs px-2 py-1 text-xs font-medium ${
                  mode === 'page' ? 'bg-seal text-white' : 'opacity-75 hover:opacity-100'
                }`}
              >
                <Columns2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Page</span>
              </button>
            </div>

            {/* Width */}
            {mode === 'strip' && (
              <div>
                <label htmlFor="reader-width-select" className="sr-only">
                  Page width
                </label>
                <select
                  id="reader-width-select"
                  value={widthMode}
                  onChange={(e) => setWidthMode(e.target.value as ReaderWidth)}
                  className={`h-8 rounded border px-2 text-xs font-medium ${
                    surface === 'ink'
                      ? 'border-[#3A3733] bg-[#22201E] text-[#EDEAE4]'
                      : 'border-rule bg-white text-ink'
                  }`}
                >
                  <option value="comfortable">Fit 760px</option>
                  <option value="wide">Wide</option>
                  <option value="full">Full Width</option>
                </select>
              </div>
            )}

            {/* Paper Surface */}
            <div
              role="group"
              aria-label="Reader background surface"
              className="inline-flex items-center rounded border border-current/20 p-0.5 text-xs"
            >
              {(['paper', 'sepia', 'ink'] as ReaderSurface[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSurface(s)}
                  className={`rounded-xs px-2 py-1 capitalize ${
                    surface === s ? 'bg-current/15 font-semibold' : 'opacity-70 hover:opacity-100'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            {/* Prev / Next Chapter */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={!adjacent.prev}
                onClick={() => adjacent.prev && onNavigateChapter(adjacent.prev)}
                aria-label="Previous chapter"
                className="inline-flex h-8 items-center rounded border border-current/20 px-2 text-xs font-medium disabled:opacity-35"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                disabled={!adjacent.next}
                onClick={() => adjacent.next && onNavigateChapter(adjacent.next)}
                aria-label="Next chapter"
                className="inline-flex h-8 items-center rounded border border-current/20 px-2 text-xs font-medium disabled:opacity-35"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Pages Viewport */}
      <main className={`mx-auto py-6 ${WIDTH_CLASSES[widthMode]}`}>
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-current/20 border-t-seal" />
            <p className="mt-4 text-sm opacity-75">Loading chapter pages from Atsumaru...</p>
          </div>
        ) : error || !readData ? (
          <div className="mx-auto max-w-lg rounded-md border border-current/20 p-8 text-center">
            <p className="font-serif text-lg">Could not load this chapter</p>
            <p className="mt-1.5 text-sm opacity-75">{error || 'Chapter unavailable.'}</p>
            <button
              type="button"
              onClick={() => setRetryTick((n) => n + 1)}
              className="mt-4 rounded-md bg-seal px-4 py-2 text-sm font-medium text-white"
            >
              Retry
            </button>
          </div>
        ) : readData.pages.length === 0 ? (
          <div className="mx-auto max-w-lg rounded-md border border-current/20 p-8 text-center">
            <p className="text-sm opacity-80">No pages were returned for this chapter.</p>
          </div>
        ) : mode === 'strip' ? (
          <div data-testid="reader-pages-strip" className="mx-auto flex flex-col">
            {readData.pages.map((page) => (
              <ReaderPageImage key={page.id} page={page} surface={surface} />
            ))}
          </div>
        ) : (
          <div data-testid="reader-single-page" className="mx-auto max-w-3xl px-2">
            <div className="mb-3 flex items-center justify-between text-xs opacity-75 tabular-nums">
              <span>
                Page {currentPageIndex + 1} of {readData.pages.length}
              </span>
              <span>Use ← / → arrow keys or click image to turn page</span>
            </div>

            <button
              type="button"
              onClick={() => {
                if (currentPageIndex < readData.pages.length - 1) {
                  setCurrentPageIndex((i) => i + 1);
                  window.scrollTo({ top: 0 });
                } else if (adjacent.next) {
                  onNavigateChapter(adjacent.next);
                }
              }}
              aria-label="Advance to next page"
              className="block w-full cursor-pointer text-left"
            >
              <ReaderPageImage
                page={readData.pages[currentPageIndex]}
                surface={surface}
              />
            </button>

            <div className="mt-4 flex items-center justify-between">
              <button
                type="button"
                disabled={currentPageIndex === 0}
                onClick={() => {
                  setCurrentPageIndex((i) => Math.max(0, i - 1));
                  window.scrollTo({ top: 0 });
                }}
                className="rounded border border-current/25 px-4 py-2 text-xs font-medium disabled:opacity-35"
              >
                ← Previous Page
              </button>
              <span className="text-xs tabular-nums opacity-75">
                {currentPageIndex + 1} / {readData.pages.length}
              </span>
              <button
                type="button"
                disabled={currentPageIndex >= readData.pages.length - 1}
                onClick={() => {
                  setCurrentPageIndex((i) => Math.min(readData.pages.length - 1, i + 1));
                  window.scrollTo({ top: 0 });
                }}
                className="rounded border border-current/25 px-4 py-2 text-xs font-medium disabled:opacity-35"
              >
                Next Page →
              </button>
            </div>
          </div>
        )}

        {/* Bottom Chapter Navigation */}
        {!loading && readData && (
          <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-current/15 px-4 pt-6">
            <button
              type="button"
              disabled={!adjacent.prev}
              onClick={() => adjacent.prev && onNavigateChapter(adjacent.prev)}
              className="inline-flex items-center gap-2 rounded-md border border-current/25 px-4 py-2.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-35"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>
                {adjacent.prev
                  ? adjacent.prev.title || `Chapter ${adjacent.prev.number}`
                  : 'First Chapter'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => onBackToSeries(mangaId)}
              className="text-xs font-medium underline underline-offset-4 opacity-80 hover:opacity-100"
            >
              All Chapters
            </button>

            <button
              type="button"
              disabled={!adjacent.next}
              onClick={() => adjacent.next && onNavigateChapter(adjacent.next)}
              className="inline-flex items-center gap-2 rounded-md bg-seal px-5 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-35"
            >
              <span>
                {adjacent.next
                  ? `Next: ${adjacent.next.title || `Chapter ${adjacent.next.number}`}`
                  : 'Latest Chapter'}
              </span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
