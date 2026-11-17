import { ArrowRight, Trash2 } from 'lucide-react';
import type {
  LibraryBookmark,
  MangaSummary,
  ReadingProgress,
} from '../types/manga';
import { CoverImage } from './CoverImage';
import { MangaCard } from './MangaCard';

interface LibraryViewProps {
  bookmarks: LibraryBookmark[];
  history: ReadingProgress[];
  onSelectManga: (id: string) => void;
  onResumeChapter: (manga: MangaSummary, chapterId: string) => void;
  onRemoveBookmark: (manga: MangaSummary) => void;
  onClearHistory: () => void;
  onExploreCatalog: () => void;
}

export function LibraryView({
  bookmarks,
  history,
  onSelectManga,
  onResumeChapter,
  onRemoveBookmark,
  onClearHistory,
  onExploreCatalog,
}: LibraryViewProps) {
  const isEmpty = bookmarks.length === 0 && history.length === 0;

  return (
    <main className="mx-auto max-w-7xl px-4 pb-20 pt-8 sm:px-6 lg:px-8">
      <div className="border-b border-rule pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-seal">
          Personal Bookshelf
        </p>
        <h1 className="mt-1.5 font-serif text-3xl font-medium text-ink">My Library</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Saved titles and chapter progress stored locally in your browser.
        </p>
      </div>

      {isEmpty ? (
        <div className="mt-12 rounded-md border border-rule bg-white p-12 text-center">
          <h2 className="font-serif text-2xl font-medium text-ink">
            Your bookshelf is currently empty
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink-muted">
            Save manga or manhwa series while browsing, or open any chapter to track your reading
            progress automatically.
          </p>
          <button
            type="button"
            onClick={onExploreCatalog}
            className="mt-6 rounded-md bg-seal px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-seal-hover"
          >
            Explore Catalog
          </button>
        </div>
      ) : (
        <div className="space-y-12 pt-8">
          {/* Saved Bookmarks */}
          <section>
            <div className="flex items-baseline justify-between border-b border-rule pb-3">
              <h2 className="font-serif text-2xl font-medium text-ink">Saved Series</h2>
              <span className="text-xs text-ink-muted tabular-nums">
                {bookmarks.length} {bookmarks.length === 1 ? 'title' : 'titles'}
              </span>
            </div>

            {bookmarks.length === 0 ? (
              <p className="mt-4 text-sm text-ink-muted">
                No saved series yet. Click “Save to Library” on any series page.
              </p>
            ) : (
              <div
                data-testid="library-bookmarks-grid"
                className="mt-6 grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6"
              >
                {bookmarks.map((entry) => (
                  <div key={entry.manga.id} className="flex flex-col">
                    <MangaCard item={entry.manga} onSelect={onSelectManga} />
                    <button
                      type="button"
                      onClick={() => onRemoveBookmark(entry.manga)}
                      aria-label={`Remove ${entry.manga.title} from library`}
                      className="mt-2 self-start text-xs text-ink-muted underline decoration-rule underline-offset-4 hover:text-seal"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Reading History */}
          {history.length > 0 && (
            <section>
              <div className="flex items-center justify-between border-b border-rule pb-3">
                <h2 className="font-serif text-2xl font-medium text-ink">
                  Reading History
                </h2>
                <button
                  type="button"
                  onClick={onClearHistory}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-muted hover:text-seal"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Clear History</span>
                </button>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {history.map((entry) => (
                  <div
                    key={entry.manga.id}
                    className="flex items-center gap-4 rounded-md border border-rule bg-white p-3.5"
                  >
                    <button
                      type="button"
                      onClick={() => onSelectManga(entry.manga.id)}
                      className="w-16 shrink-0"
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
                      <p className="mt-1 truncate text-xs text-ink-muted tabular-nums">
                        Last read: {entry.chapterTitle || `Chapter ${entry.chapterNumber}`}
                      </p>
                      <button
                        type="button"
                        onClick={() => onResumeChapter(entry.manga, entry.chapterId)}
                        className="mt-2.5 inline-flex items-center gap-1 text-xs font-semibold text-seal hover:underline"
                      >
                        <span>Continue Reading</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </main>
  );
}
