export type SeriesFormat = 'All' | 'Manhwa' | 'Manga' | 'Manhua' | 'OEL';

export type ShelfKind =
  | 'popular'
  | 'hotUpdates'
  | 'topRated'
  | 'rising'
  | 'hiddenGems'
  | 'recentlyAdded';

export type SortOption = 'relevance' | 'views' | 'rating' | 'recent' | 'title';

export interface MangaSummary {
  id: string;
  title: string;
  englishTitle?: string | null;
  authors: string[];
  format: string;
  status?: string;
  rating: number | null;
  viewsLabel: string;
  viewsCount?: number;
  chapterCount?: number;
  posterPath: string;
  posterUrl: string;
  year?: number | null;
}

export interface GenreTag {
  id: string;
  name: string;
}

export interface ScanlatorInfo {
  id: string;
  name: string;
  score: number;
  firstChapter?: {
    id: string;
    title: string;
    number: number;
  };
}

export interface MangaDetail extends MangaSummary {
  otherNames: string[];
  synopsis: string;
  genres: GenreTag[];
  tags: string[];
  bannerUrl: string | null;
  scanlators: ScanlatorInfo[];
  totalChapterCount: number;
  recommendations: MangaSummary[];
  similarManga: MangaSummary[];
}

export interface ChapterItem {
  id: string;
  scanlationMangaId?: string;
  title: string;
  number: number;
  index: number;
  pageCount?: number;
  createdAt?: number | string;
}

export interface ChapterPage {
  id: string;
  imageUrl: string;
  number: number;
  width: number;
  height: number;
  aspectRatio: number;
}

export interface ChapterReadData {
  id: string;
  title: string;
  number: number;
  scanlationMangaId?: string;
  pages: ChapterPage[];
}

export interface SearchResponse {
  found: number;
  page: number;
  perPage: number;
  totalPages: number;
  items: MangaSummary[];
}

export interface LibraryBookmark {
  manga: MangaSummary;
  addedAt: number;
}

export interface ReadingProgress {
  manga: MangaSummary;
  chapterId: string;
  chapterTitle: string;
  chapterNumber: number;
  updatedAt: number;
}
