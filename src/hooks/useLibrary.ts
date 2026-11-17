import { useCallback, useEffect, useState } from 'react';
import type {
  ChapterItem,
  LibraryBookmark,
  MangaSummary,
  ReadingProgress,
} from '../types/manga';

const BOOKMARKS_KEY = 'novatoons:bookmarks:v1';
const HISTORY_KEY = 'novatoons:history:v1';
const READ_CHAPTERS_KEY = 'novatoons:readChapters:v1';

function readStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function useLibrary() {
  const [bookmarks, setBookmarks] = useState<LibraryBookmark[]>(() =>
    readStorage<LibraryBookmark[]>(BOOKMARKS_KEY, [])
  );
  const [history, setHistory] = useState<ReadingProgress[]>(() =>
    readStorage<ReadingProgress[]>(HISTORY_KEY, [])
  );
  const [readChapterIds, setReadChapterIds] = useState<Record<string, string[]>>(() =>
    readStorage<Record<string, string[]>>(READ_CHAPTERS_KEY, {})
  );

  useEffect(() => {
    try {
      window.localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
    } catch {
      // Ignore storage quota errors
    }
  }, [bookmarks]);

  useEffect(() => {
    try {
      window.localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch {
      // Ignore storage quota errors
    }
  }, [history]);

  useEffect(() => {
    try {
      window.localStorage.setItem(READ_CHAPTERS_KEY, JSON.stringify(readChapterIds));
    } catch {
      // Ignore storage quota errors
    }
  }, [readChapterIds]);

  const isBookmarked = useCallback(
    (mangaId: string) => bookmarks.some((b) => b.manga.id === mangaId),
    [bookmarks]
  );

  const toggleBookmark = useCallback((manga: MangaSummary) => {
    setBookmarks((prev) => {
      const exists = prev.some((b) => b.manga.id === manga.id);
      if (exists) {
        return prev.filter((b) => b.manga.id !== manga.id);
      }
      return [{ manga, addedAt: Date.now() }, ...prev];
    });
  }, []);

  const recordProgress = useCallback((manga: MangaSummary, chapter: ChapterItem) => {
    setHistory((prev) => {
      const filtered = prev.filter((h) => h.manga.id !== manga.id);
      return [
        {
          manga,
          chapterId: chapter.id,
          chapterTitle: chapter.title,
          chapterNumber: chapter.number,
          updatedAt: Date.now(),
        },
        ...filtered,
      ].slice(0, 30);
    });

    setReadChapterIds((prev) => {
      const existing = prev[manga.id] ?? [];
      if (existing.includes(chapter.id)) return prev;
      return {
        ...prev,
        [manga.id]: [...existing, chapter.id],
      };
    });
  }, []);

  const getProgressForManga = useCallback(
    (mangaId: string) => history.find((h) => h.manga.id === mangaId) ?? null,
    [history]
  );

  const getReadChaptersForManga = useCallback(
    (mangaId: string) => readChapterIds[mangaId] ?? [],
    [readChapterIds]
  );

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  return {
    bookmarks,
    history,
    isBookmarked,
    toggleBookmark,
    recordProgress,
    getProgressForManga,
    getReadChaptersForManga,
    clearHistory,
  };
}
