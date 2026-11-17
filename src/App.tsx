import { useCallback, useEffect, useState } from 'react';
import { BrowseView } from './components/BrowseView';
import { Header, type ActiveTab } from './components/Header';
import { HomeView } from './components/HomeView';
import { LibraryView } from './components/LibraryView';
import { ReaderView } from './components/ReaderView';
import { SeriesDetailView } from './components/SeriesDetailView';
import { useLibrary } from './hooks/useLibrary';
import type {
  ChapterItem,
  MangaSummary,
  SeriesFormat,
  SortOption,
} from './types/manga';

type AppRoute =
  | { view: 'home' }
  | {
      view: 'browse';
      query: string;
      format: SeriesFormat;
      genreId: string;
      status: string;
      sort: SortOption;
      page: number;
      autoFocus?: boolean;
    }
  | { view: 'series'; mangaId: string }
  | { view: 'reader'; mangaId: string; chapterId: string }
  | { view: 'library' };

function parseHashToRoute(hash: string): AppRoute {
  const clean = hash.replace(/^#/, '');
  if (!clean || clean === '/' || clean === '/home') {
    return { view: 'home' };
  }
  if (clean.startsWith('/library')) {
    return { view: 'library' };
  }
  if (clean.startsWith('/series/')) {
    const mangaId = decodeURIComponent(clean.slice('/series/'.length).split('?')[0] || '');
    if (mangaId) return { view: 'series', mangaId };
  }
  if (clean.startsWith('/read/')) {
    const parts = clean.slice('/read/'.length).split('/');
    const mangaId = decodeURIComponent(parts[0] || '');
    const chapterId = decodeURIComponent((parts[1] || '').split('?')[0]);
    if (mangaId && chapterId) return { view: 'reader', mangaId, chapterId };
  }
  if (clean.startsWith('/browse')) {
    const [, qs = ''] = clean.split('?');
    const params = new URLSearchParams(qs);
    const fmt = (params.get('format') as SeriesFormat) || 'All';
    const sort = (params.get('sort') as SortOption) || 'relevance';
    return {
      view: 'browse',
      query: params.get('q') ?? '',
      format: ['All', 'Manhwa', 'Manga', 'Manhua', 'OEL'].includes(fmt) ? fmt : 'All',
      genreId: params.get('genreId') ?? '',
      status: params.get('status') ?? '',
      sort: ['relevance', 'views', 'rating', 'recent', 'title'].includes(sort)
        ? sort
        : 'relevance',
      page: Math.max(1, Number(params.get('page') ?? 1) || 1),
    };
  }
  return { view: 'home' };
}

function routeToHash(route: AppRoute): string {
  switch (route.view) {
    case 'home':
      return '#/';
    case 'library':
      return '#/library';
    case 'series':
      return `#/series/${encodeURIComponent(route.mangaId)}`;
    case 'reader':
      return `#/read/${encodeURIComponent(route.mangaId)}/${encodeURIComponent(route.chapterId)}`;
    case 'browse': {
      const params = new URLSearchParams();
      if (route.query) params.set('q', route.query);
      if (route.format !== 'All') params.set('format', route.format);
      if (route.genreId) params.set('genreId', route.genreId);
      if (route.status) params.set('status', route.status);
      if (route.sort !== 'relevance') params.set('sort', route.sort);
      if (route.page > 1) params.set('page', String(route.page));
      const qs = params.toString();
      return qs ? `#/browse?${qs}` : '#/browse';
    }
  }
}

export default function App() {
  const [route, setRoute] = useState<AppRoute>(() =>
    parseHashToRoute(typeof window !== 'undefined' ? window.location.hash : '')
  );
  const [readerCache, setReaderCache] = useState<{
    manga: MangaSummary | null;
    chapters: ChapterItem[];
  }>({ manga: null, chapters: [] });

  const {
    bookmarks,
    history,
    isBookmarked,
    toggleBookmark,
    recordProgress,
    getProgressForManga,
    getReadChaptersForManga,
    clearHistory,
  } = useLibrary();

  const navigate = useCallback((next: AppRoute) => {
    setRoute(next);
    const nextHash = routeToHash(next);
    if (window.location.hash !== nextHash) {
      window.location.hash = nextHash;
    }
    window.scrollTo({ top: 0 });
  }, []);

  useEffect(() => {
    function onHashChange() {
      setRoute(parseHashToRoute(window.location.hash));
    }
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // Global Cmd/Ctrl+K shortcut to jump straight to Catalog Search
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        navigate({
          view: 'browse',
          query: '',
          format: 'All',
          genreId: '',
          status: '',
          sort: 'relevance',
          page: 1,
          autoFocus: true,
        });
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [navigate]);

  const activeTab: ActiveTab =
    route.view === 'home'
      ? 'home'
      : route.view === 'library'
      ? 'library'
      : route.view === 'browse' && route.format === 'Manhwa'
      ? 'manhwa'
      : route.view === 'browse' && route.format === 'Manga'
      ? 'manga'
      : 'browse';

  const handleHeaderNavigate = useCallback(
    (tab: ActiveTab) => {
      switch (tab) {
        case 'home':
          navigate({ view: 'home' });
          break;
        case 'browse':
          navigate({
            view: 'browse',
            query: '',
            format: 'All',
            genreId: '',
            status: '',
            sort: 'views',
            page: 1,
          });
          break;
        case 'manhwa':
          navigate({
            view: 'browse',
            query: '',
            format: 'Manhwa',
            genreId: '',
            status: '',
            sort: 'views',
            page: 1,
          });
          break;
        case 'manga':
          navigate({
            view: 'browse',
            query: '',
            format: 'Manga',
            genreId: '',
            status: '',
            sort: 'views',
            page: 1,
          });
          break;
        case 'library':
          navigate({ view: 'library' });
          break;
      }
    },
    [navigate]
  );

  const handleOpenSearch = useCallback(() => {
    navigate({
      view: 'browse',
      query: route.view === 'browse' ? route.query : '',
      format: 'All',
      genreId: '',
      status: '',
      sort: 'relevance',
      page: 1,
      autoFocus: true,
    });
  }, [navigate, route]);

  const handleBrowseUpdate = useCallback(
    (next: {
      query?: string;
      format?: SeriesFormat;
      genreId?: string;
      status?: string;
      sort?: SortOption;
      page?: number;
    }) => {
      setRoute((prev) => {
        if (prev.view !== 'browse') return prev;
        const updated: AppRoute = {
          ...prev,
          ...next,
          autoFocus: false,
        };
        const nextHash = routeToHash(updated);
        if (window.location.hash !== nextHash) {
          window.history.replaceState(null, '', nextHash);
        }
        return updated;
      });
    },
    []
  );

  if (route.view === 'reader') {
    return (
      <ReaderView
        mangaId={route.mangaId}
        chapterId={route.chapterId}
        initialManga={readerCache.manga}
        initialChapters={readerCache.chapters}
        onBackToSeries={(id) => navigate({ view: 'series', mangaId: id })}
        onNavigateChapter={(ch) =>
          navigate({ view: 'reader', mangaId: route.mangaId, chapterId: ch.id })
        }
        onChapterLoaded={(manga, ch) => recordProgress(manga, ch)}
      />
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-paper text-ink">
      <Header
        activeTab={activeTab}
        onNavigate={handleHeaderNavigate}
        onOpenSearch={handleOpenSearch}
        bookmarkCount={bookmarks.length}
      />

      <div className="flex-1">
        {route.view === 'home' && (
          <HomeView
            history={history}
            onSearchSubmit={(query) =>
              navigate({
                view: 'browse',
                query,
                format: 'All',
                genreId: '',
                status: '',
                sort: 'relevance',
                page: 1,
              })
            }
            onSelectManga={(mangaId) => navigate({ view: 'series', mangaId })}
            onResumeChapter={(manga, chapterId) => {
              setReaderCache({ manga, chapters: [] });
              navigate({ view: 'reader', mangaId: manga.id, chapterId });
            }}
            onBrowseAll={(format = 'All') =>
              navigate({
                view: 'browse',
                query: '',
                format,
                genreId: '',
                status: '',
                sort: 'views',
                page: 1,
              })
            }
          />
        )}

        {route.view === 'browse' && (
          <BrowseView
            query={route.query}
            format={route.format}
            genreId={route.genreId}
            status={route.status}
            sort={route.sort}
            page={route.page}
            autoFocusSearch={route.autoFocus}
            onUpdateParams={handleBrowseUpdate}
            onSelectManga={(mangaId) => navigate({ view: 'series', mangaId })}
          />
        )}

        {route.view === 'series' && (
          <SeriesDetailView
            mangaId={route.mangaId}
            onBack={() => {
              if (window.history.length > 1) {
                window.history.back();
              } else {
                navigate({ view: 'home' });
              }
            }}
            onOpenChapter={(manga, chapter, allChapters) => {
              setReaderCache({ manga, chapters: allChapters });
              recordProgress(manga, chapter);
              navigate({
                view: 'reader',
                mangaId: manga.id,
                chapterId: chapter.id,
              });
            }}
            onSelectManga={(mangaId) => navigate({ view: 'series', mangaId })}
            onSelectGenre={(genreId) =>
              navigate({
                view: 'browse',
                query: '',
                format: 'All',
                genreId,
                status: '',
                sort: 'views',
                page: 1,
              })
            }
            isBookmarked={isBookmarked(route.mangaId)}
            onToggleBookmark={toggleBookmark}
            progress={getProgressForManga(route.mangaId)}
            readChapterIds={getReadChaptersForManga(route.mangaId)}
          />
        )}

        {route.view === 'library' && (
          <LibraryView
            bookmarks={bookmarks}
            history={history}
            onSelectManga={(mangaId) => navigate({ view: 'series', mangaId })}
            onResumeChapter={(manga, chapterId) => {
              setReaderCache({ manga, chapters: [] });
              navigate({ view: 'reader', mangaId: manga.id, chapterId });
            }}
            onRemoveBookmark={toggleBookmark}
            onClearHistory={clearHistory}
            onExploreCatalog={() =>
              navigate({
                view: 'browse',
                query: '',
                format: 'All',
                genreId: '',
                status: '',
                sort: 'views',
                page: 1,
              })
            }
          />
        )}
      </div>

      <footer className="border-t border-rule bg-linen/50">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-8 text-xs text-ink-muted sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <span className="font-serif text-sm font-semibold text-ink">Nova Toons</span>
            <span aria-hidden="true">·</span>
            <span>Catalog &amp; reader linked live to atsu.moe</span>
          </div>
          <div className="flex flex-wrap items-center gap-5">
            <button
              type="button"
              onClick={() => handleHeaderNavigate('home')}
              className="hover:text-ink"
            >
              Home
            </button>
            <button
              type="button"
              onClick={() => handleHeaderNavigate('manhwa')}
              className="hover:text-ink"
            >
              Manhwa
            </button>
            <button
              type="button"
              onClick={() => handleHeaderNavigate('manga')}
              className="hover:text-ink"
            >
              Manga
            </button>
            <button
              type="button"
              onClick={() => handleHeaderNavigate('library')}
              className="hover:text-ink"
            >
              My Library
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
