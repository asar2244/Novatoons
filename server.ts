import { execFile } from 'child_process';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  buildMediaProxyUrl,
  buildTypesenseSearchParams,
  cleanSynopsis,
  formatRating,
  formatTypesForAtsuQuery,
  formatViews,
  isSafeStaticPath,
  normalizeFormat,
  normalizeHomeItem,
  normalizeSearchDocument,
  normalizeStaticPath,
} from './src/utils/atsu.ts';
import type {
  ChapterItem,
  ChapterReadData,
  GenreTag,
  MangaDetail,
  SeriesFormat,
  ShelfKind,
  SortOption,
} from './src/types/manga.ts';

const ATSU_ORIGIN = 'https://atsu.moe';
const ATSU_CDN_ORIGIN = 'https://cdn.atsu.moe';
const BROWSER_UA = 'Mozilla/5.0';

const ALLOWED_SHELVES = new Set<ShelfKind>([
  'popular',
  'hotUpdates',
  'topRated',
  'rising',
  'hiddenGems',
  'recentlyAdded',
]);

const EXCLUDED_ADULT_GENRES = new Set(['Adult', 'Hentai', 'Smut']);

let cachedGenres: { data: GenreTag[]; expiresAt: number } | null = null;

function curlFetchBuffer(
  url: string,
  acceptHeader: string
): Promise<{ status: number; contentType: string; body: Buffer }> {
  return new Promise<{ status: number; contentType: string; body: Buffer }>((resolve, reject) => {
    execFile(
      'curl',
      [
        '-sS',
        '-L',
        '--max-time',
        '15',
        '-i',
        '-A',
        BROWSER_UA,
        '-H',
        `Accept: ${acceptHeader}`,
        '-H',
        'Referer: https://atsu.moe/',
        url,
      ],
      { encoding: 'buffer', maxBuffer: 25 * 1024 * 1024 },
      (error, stdout) => {
        if (error) {
          reject(new Error(`Upstream curl failed: ${error.message}`));
          return;
        }
        let offset = 0;
        let lastHeaderBlock = '';
        while (stdout.subarray(offset, offset + 5).toString('ascii') === 'HTTP/') {
          const crlfSep = stdout.indexOf('\r\n\r\n', offset);
          const lfSep = stdout.indexOf('\n\n', offset);
          let sep = -1;
          let sepLen = 4;
          if (crlfSep !== -1 && (lfSep === -1 || crlfSep < lfSep)) {
            sep = crlfSep;
            sepLen = 4;
          } else if (lfSep !== -1) {
            sep = lfSep;
            sepLen = 2;
          }
          if (sep === -1) break;
          lastHeaderBlock = stdout.subarray(offset, sep).toString('utf8');
          offset = sep + sepLen;
        }
        const statusMatch = /^HTTP\/[\d.]+ (\d+)/m.exec(lastHeaderBlock);
        const status = statusMatch ? Number(statusMatch[1]) : 200;
        const ctMatch = /^content-type:\s*([^\r\n]+)/im.exec(lastHeaderBlock);
        const contentType = ctMatch ? ctMatch[1].trim() : 'application/octet-stream';
        resolve({ status, contentType, body: stdout.subarray(offset) });
      }
    );
  }).catch(async (curlError) => {
    // Fallback to native fetch if curl binary is unavailable in a minimal container
    const response = await fetch(url, {
      headers: {
        'User-Agent': BROWSER_UA,
        Accept: acceptHeader,
        Referer: 'https://atsu.moe/',
      },
      signal: AbortSignal.timeout(15000),
    });
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const body = Buffer.from(await response.arrayBuffer());
    if (!response.ok && body.length === 0) {
      throw curlError;
    }
    return { status: response.status, contentType, body };
  });
}

async function fetchAtsuJson<T>(url: string): Promise<T> {
  const { status, contentType, body } = await curlFetchBuffer(
    url,
    'application/json, text/plain, */*'
  );
  const text = body.toString('utf8');
  if (status >= 400) {
    throw new Error(`Atsumaru request failed (${status})`);
  }
  if (contentType.includes('text/html') || text.trimStart().startsWith('<')) {
    throw new Error('Atsumaru returned an unexpected HTML response instead of JSON.');
  }
  return JSON.parse(text) as T;
}

export function createApiApp() {
  const app = express();

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'Nova Toons' });
  });

  app.get('/api/home', async (req, res) => {
    try {
      const shelfRaw = String(req.query.shelf ?? 'popular') as ShelfKind;
      const shelf: ShelfKind = ALLOWED_SHELVES.has(shelfRaw) ? shelfRaw : 'popular';
      const limit = Math.min(36, Math.max(1, Number(req.query.limit ?? 18) || 18));
      const offset = Math.max(0, Number(req.query.offset ?? 0) || 0);
      const format = (String(req.query.format ?? 'All') as SeriesFormat) || 'All';

      const params = new URLSearchParams({
        offset: String(offset),
        limit: String(limit),
        contentRatings: 'Safe,Suggestive',
        mediums: 'Comic',
      });

      const types = formatTypesForAtsuQuery(format);
      if (types && types.length > 0) {
        params.set('types', types.join(','));
      }

      const data = await fetchAtsuJson<{ items?: Record<string, unknown>[] }>(
        `${ATSU_ORIGIN}/api/home2/${shelf}?${params.toString()}`
      );
      const items = (data.items ?? []).map(normalizeHomeItem);
      res.json({ shelf, format, items });
    } catch (error) {
      console.error('Error fetching home shelf:', error);
      res.status(502).json({ error: 'Unable to load catalog shelf from Atsumaru.' });
    }
  });

  app.get('/api/genres', async (_req, res) => {
    try {
      if (cachedGenres && cachedGenres.expiresAt > Date.now()) {
        res.json({ genres: cachedGenres.data });
        return;
      }
      const data = await fetchAtsuJson<{ genres?: GenreTag[] }>(
        `${ATSU_ORIGIN}/api/explore/availableFilters`
      );
      const genres = (data.genres ?? [])
        .filter((g) => !EXCLUDED_ADULT_GENRES.has(g.name))
        .sort((a, b) => a.name.localeCompare(b.name));
      cachedGenres = { data: genres, expiresAt: Date.now() + 60 * 60 * 1000 };
      res.json({ genres });
    } catch (error) {
      console.error('Error fetching genres:', error);
      res.status(502).json({ error: 'Unable to load genres from Atsumaru.' });
    }
  });

  app.get('/api/search', async (req, res) => {
    try {
      const q = String(req.query.q ?? '');
      const format = (String(req.query.format ?? 'All') as SeriesFormat) || 'All';
      const genreId = req.query.genreId ? String(req.query.genreId) : undefined;
      const status = req.query.status ? String(req.query.status) : undefined;
      const sort = (String(req.query.sort ?? 'relevance') as SortOption) || 'relevance';
      const page = Math.max(1, Number(req.query.page ?? 1) || 1);
      const perPage = Math.min(48, Math.max(1, Number(req.query.perPage ?? 24) || 24));

      const params = buildTypesenseSearchParams({
        q,
        format,
        genreId,
        status,
        sort,
        page,
        perPage,
      });

      const data = await fetchAtsuJson<{
        found?: number;
        page?: number;
        hits?: Array<{ document?: Record<string, unknown> }>;
      }>(`${ATSU_ORIGIN}/collections/manga/documents/search?${params.toString()}`);

      const found = Number(data.found ?? 0);
      const items = (data.hits ?? [])
        .map((hit) => hit.document)
        .filter((doc): doc is Record<string, unknown> => Boolean(doc))
        .map(normalizeSearchDocument);

      res.json({
        found,
        page,
        perPage,
        totalPages: Math.max(1, Math.ceil(found / perPage)),
        items,
      });
    } catch (error) {
      console.error('Error searching Atsumaru:', error);
      res.status(502).json({ error: 'Search request to Atsumaru failed.' });
    }
  });

  app.get('/api/manga/:id', async (req, res) => {
    try {
      const id = String(req.params.id ?? '').trim();
      if (!/^[a-zA-Z0-9_-]{2,32}$/.test(id)) {
        res.status(400).json({ error: 'Invalid series identifier.' });
        return;
      }

      const [pageData, chaptersData] = await Promise.all([
        fetchAtsuJson<{ mangaPage?: Record<string, unknown> }>(
          `${ATSU_ORIGIN}/api/manga/page?id=${encodeURIComponent(id)}`
        ),
        fetchAtsuJson<{ chapters?: ChapterItem[] }>(
          `${ATSU_ORIGIN}/api/manga/allChapters?mangaId=${encodeURIComponent(id)}`
        ).catch(() => ({ chapters: [] })),
      ]);

      const raw = pageData.mangaPage;
      if (!raw) {
        res.status(404).json({ error: 'Series not found on Atsumaru.' });
        return;
      }

      const posterObj = (raw.poster as Record<string, unknown> | undefined) ?? {};
      const posterRaw =
        (posterObj.mediumImage as string | undefined) ||
        (posterObj.image as string | undefined) ||
        '';
      const posterPath = normalizeStaticPath(posterRaw);

      const bannerObj = raw.banner as Record<string, unknown> | undefined;
      const bannerUrl =
        bannerObj && typeof bannerObj.url === 'string'
          ? buildMediaProxyUrl(bannerObj.url)
          : null;

      const authors = Array.isArray(raw.authors)
        ? raw.authors
            .map((a) =>
              typeof a === 'object' && a && 'name' in a ? String((a as { name: unknown }).name) : ''
            )
            .filter(Boolean)
        : [];

      const genres: GenreTag[] = Array.isArray(raw.genres)
        ? raw.genres
            .map((g) => ({
              id: String((g as { id?: unknown }).id ?? ''),
              name: String((g as { name?: unknown }).name ?? ''),
            }))
            .filter((g) => g.id && g.name && !EXCLUDED_ADULT_GENRES.has(g.name))
        : [];

      const tags: string[] = Array.isArray(raw.tags)
        ? raw.tags
            .slice(0, 14)
            .map((t) =>
              typeof t === 'object' && t && 'name' in t ? String((t as { name: unknown }).name) : ''
            )
            .filter(Boolean)
        : [];

      const scanlators = Array.isArray(raw.scanlators)
        ? raw.scanlators.map((s) => {
            const sc = s as Record<string, unknown>;
            const fc = sc.firstChapter as Record<string, unknown> | undefined;
            return {
              id: String(sc.id ?? ''),
              name: String(sc.name ?? 'Unknown'),
              score: Number(sc.score ?? 0),
              firstChapter: fc
                ? {
                    id: String(fc.id ?? ''),
                    title: String(fc.title ?? ''),
                    number: Number(fc.number ?? 0),
                  }
                : undefined,
            };
          })
        : [];

      const recommendations = Array.isArray(raw.recommendations)
        ? raw.recommendations.slice(0, 8).map((r) => normalizeHomeItem(r as Record<string, unknown>))
        : [];

      const similarManga = Array.isArray(raw.similarManga)
        ? raw.similarManga.slice(0, 8).map((r) => normalizeHomeItem(r as Record<string, unknown>))
        : [];

      const chapters: ChapterItem[] =
        chaptersData.chapters && chaptersData.chapters.length > 0
          ? chaptersData.chapters
          : Array.isArray(raw.chapters)
          ? (raw.chapters as ChapterItem[])
          : [];

      const detail: MangaDetail = {
        id: String(raw.id ?? id),
        title: String(raw.title ?? 'Untitled'),
        englishTitle: typeof raw.englishTitle === 'string' ? raw.englishTitle : null,
        otherNames: Array.isArray(raw.otherNames) ? raw.otherNames.map(String) : [],
        authors,
        format: normalizeFormat(typeof raw.type === 'string' ? raw.type : undefined),
        status: typeof raw.status === 'string' ? raw.status : undefined,
        rating: formatRating(typeof raw.avgRating === 'number' ? raw.avgRating : null),
        viewsLabel: formatViews(raw.views as number | string | null | undefined),
        posterPath,
        posterUrl: buildMediaProxyUrl(posterPath),
        bannerUrl,
        synopsis: cleanSynopsis(typeof raw.synopsis === 'string' ? raw.synopsis : '').join('\n\n'),
        genres,
        tags,
        scanlators,
        totalChapterCount: Number(raw.totalChapterCount ?? chapters.length ?? 0),
        recommendations,
        similarManga,
      };

      res.json({ manga: detail, chapters });
    } catch (error) {
      console.error('Error loading series detail:', error);
      res.status(502).json({ error: 'Unable to load series details from Atsumaru.' });
    }
  });

  app.get('/api/read', async (req, res) => {
    try {
      const mangaId = String(req.query.mangaId ?? '').trim();
      const chapterId = String(req.query.chapterId ?? '').trim();
      if (!/^[a-zA-Z0-9_-]{2,32}$/.test(mangaId) || !/^[a-zA-Z0-9_-]{2,40}$/.test(chapterId)) {
        res.status(400).json({ error: 'Invalid manga or chapter identifier.' });
        return;
      }

      const data = await fetchAtsuJson<{
        readChapter?: {
          id: string;
          number: number;
          title: string;
          scanlationMangaId?: string;
          pages?: Array<{
            id: string;
            image: string;
            number: number;
            width: number;
            height: number;
            aspectRatio: number;
          }>;
        };
      }>(
        `${ATSU_ORIGIN}/api/read/chapter?mangaId=${encodeURIComponent(
          mangaId
        )}&chapterId=${encodeURIComponent(chapterId)}`
      );

      if (!data.readChapter) {
        res.status(404).json({ error: 'Chapter not found.' });
        return;
      }

      const rc = data.readChapter;
      const chapter: ChapterReadData = {
        id: rc.id,
        title: rc.title,
        number: rc.number,
        scanlationMangaId: rc.scanlationMangaId,
        pages: (rc.pages ?? []).map((p) => ({
          id: p.id,
          imageUrl: buildMediaProxyUrl(p.image),
          number: p.number,
          width: p.width,
          height: p.height,
          aspectRatio: p.aspectRatio || (p.width && p.height ? p.width / p.height : 0.7),
        })),
      };

      res.json({ chapter });
    } catch (error) {
      console.error('Error loading chapter pages:', error);
      res.status(502).json({ error: 'Unable to load chapter pages from Atsumaru.' });
    }
  });

  app.get('/api/media', async (req, res) => {
    try {
      const rawPath = String(req.query.path ?? '');
      const cleanPath = normalizeStaticPath(rawPath);
      if (!isSafeStaticPath(cleanPath)) {
        res.status(400).send('Invalid media path');
        return;
      }

      const targetUrl = `${ATSU_CDN_ORIGIN}/static/${cleanPath}`;
      const { status, contentType, body } = await curlFetchBuffer(
        targetUrl,
        'image/avif,image/webp,image/png,image/jpeg,*/*'
      );

      if (status >= 400 || contentType.includes('text/html')) {
        res.status(status >= 400 ? status : 502).send('Media unavailable');
        return;
      }

      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.send(body);
    } catch (error) {
      console.error('Error proxying media:', error);
      res.status(502).send('Media proxy error');
    }
  });

  return app;
}

function resolvePort(isDevServer: boolean): number {
  const portFlagIdx = process.argv.indexOf('--port');
  if (portFlagIdx !== -1 && process.argv[portFlagIdx + 1]) {
    const cliPort = Number(process.argv[portFlagIdx + 1]);
    if (Number.isFinite(cliPort) && cliPort > 0) {
      return cliPort;
    }
  }
  const envPort = Number(process.env.PORT || 0);
  if (isDevServer && process.env.NGINX_PORT && envPort === Number(process.env.NGINX_PORT)) {
    return Number(process.env.DEFAULT_APP_PORT || 3000);
  }
  return envPort > 0 ? envPort : Number(process.env.DEFAULT_APP_PORT || 3000);
}

async function startServer() {
  const app = createApiApp();
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const distDir = path.resolve(__dirname, 'dist');
  const hasBuiltDist = fs.existsSync(path.join(distDir, 'index.html'));
  const runningViaTsx = process.execArgv.some((arg) => arg.includes('tsx'));
  const isProduction =
    process.env.NODE_ENV === 'production' || process.env.npm_lifecycle_event === 'start';
  const isDevServer =
    !isProduction &&
    (process.env.VITE_DEV_SERVER === 'true' ||
      runningViaTsx ||
      process.env.npm_lifecycle_event === 'dev' ||
      (!process.env.K_SERVICE && !hasBuiltDist));
  const port = resolvePort(isDevServer);

  if (isDevServer) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        ...(process.env.DISABLE_HMR === 'true' ? { hmr: false } : {}),
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const server = app.listen(port, '0.0.0.0', () => {
    console.log(`Nova Toons server listening on http://localhost:${port}`);
  });

  server.on('error', (err) => {
    console.error('Nova Toons HTTP server error:', err);
    process.exit(1);
  });
}

startServer().catch((err) => {
  console.error('Failed to start Nova Toons server:', err);
  process.exit(1);
});
