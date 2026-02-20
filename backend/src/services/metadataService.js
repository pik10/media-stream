const OMDB_API_BASE = process.env.OMDB_API_BASE || 'https://www.omdbapi.com/';
const OMDB_REQUEST_TIMEOUT_MS = Math.max(1000, parseInt(process.env.OMDB_REQUEST_TIMEOUT_MS || '5000', 10));
const OMITTED_WORDS = new Set([
  '1080p', '2160p', '720p', '480p', 'x264', 'x265', 'h264', 'h265',
  'bluray', 'brrip', 'webrip', 'webdl', 'hdrip', 'dvdrip', 'remux', 'yify'
]);

function normalizeWhitespace(value) {
  return `${value || ''}`.replace(/\s+/g, ' ').trim();
}

function stripNoiseFromName(fileName) {
  let cleaned = fileName
    .replace(/\.[^/.]+$/, '')
    .replace(/[._]+/g, ' ')
    .replace(/[\[\]{}()]/g, ' ')
    .replace(/\b(S\d{1,2}E\d{1,2}|E\d{1,2})\b/gi, ' ')
    .replace(/\b(19|20)\d{2}\b/g, (match) => ` ${match} `);

  cleaned = cleaned
    .split(' ')
    .filter((part) => part && !OMITTED_WORDS.has(part.toLowerCase()))
    .join(' ');

  return normalizeWhitespace(cleaned);
}

function extractTitleAndYear(videoKey) {
  const fileName = videoKey.split('/').pop() || videoKey;
  const cleaned = stripNoiseFromName(fileName);
  const yearMatch = cleaned.match(/\b(19|20)\d{2}\b/);
  const year = yearMatch ? parseInt(yearMatch[0], 10) : null;
  const title = normalizeWhitespace(cleaned.replace(/\b(19|20)\d{2}\b/, ' '));

  if (!title) return null;

  return { title, year };
}

async function fetchJsonWithTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`Metadata provider error: HTTP ${response.status}`);
    }
    return response.json();
  } finally {
    clearTimeout(timeout);
  }
}

function mapOmdbResult(result) {
  if (!result || result.Response !== 'True') return null;

  const year = parseInt(result.Year, 10);
  const imdbRating = parseFloat(result.imdbRating);
  const posterUrl = result.Poster && result.Poster !== 'N/A' ? result.Poster : null;
  const plot = result.Plot && result.Plot !== 'N/A' ? result.Plot : null;

  return {
    title: result.Title || null,
    year: Number.isNaN(year) ? null : year,
    plot,
    posterUrl,
    imdbRating: Number.isNaN(imdbRating) ? null : imdbRating,
    source: 'omdb'
  };
}

function hasMetadataConfigured() {
  return Boolean(process.env.OMDB_API_KEY);
}

export async function lookupMetadataForVideoKey(videoKey) {
  if (!hasMetadataConfigured()) {
    return null;
  }

  const parsed = extractTitleAndYear(videoKey);
  if (!parsed) return null;

  const url = new URL(OMDB_API_BASE);
  url.searchParams.set('apikey', process.env.OMDB_API_KEY);
  url.searchParams.set('t', parsed.title);
  if (parsed.year) {
    url.searchParams.set('y', `${parsed.year}`);
  }

  try {
    const data = await fetchJsonWithTimeout(url.toString(), OMDB_REQUEST_TIMEOUT_MS);
    return mapOmdbResult(data);
  } catch (error) {
    console.warn(`[metadata] lookup failed for "${videoKey}": ${error.message}`);
    return null;
  }
}

