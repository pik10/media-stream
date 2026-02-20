const OMITTED_WORDS = new Set([
  '1080p', '2160p', '720p', '480p', 'x264', 'x265', 'h264', 'h265',
  'bluray', 'brrip', 'webrip', 'webdl', 'hdrip', 'dvdrip', 'remux', 'yify'
]);

function normalizeWhitespace(value) {
  return `${value || ''}`.replace(/\s+/g, ' ').trim();
}

function parseDateToIsoDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function parseDelimitedList(value) {
  if (!value || value === 'N/A') return [];
  return value.split(',').map((entry) => normalizeWhitespace(entry)).filter(Boolean);
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
  const runtime = parseInt(`${result.Runtime || ''}`.replace(/[^\d]/g, ''), 10);
  const voteCount = parseInt(`${result.imdbVotes || ''}`.replace(/,/g, ''), 10);
  const posterUrl = result.Poster && result.Poster !== 'N/A' ? result.Poster : null;
  const plot = result.Plot && result.Plot !== 'N/A' ? result.Plot : null;
  const releaseDate = parseDateToIsoDate(result.Released);
  const genres = parseDelimitedList(result.Genre);
  const cast = parseDelimitedList(result.Actors);
  const castPeople = cast.map((name) => ({ name, profileUrl: null }));
  const director = result.Director && result.Director !== 'N/A'
    ? normalizeWhitespace(result.Director)
    : null;
  const certification = result.Rated && result.Rated !== 'N/A'
    ? normalizeWhitespace(result.Rated)
    : null;

  return {
    title: result.Title || null,
    year: Number.isNaN(year) ? null : year,
    plot,
    posterUrl,
    imdbRating: Number.isNaN(imdbRating) ? null : imdbRating,
    voteCount: Number.isNaN(voteCount) ? null : voteCount,
    releaseDate,
    runtimeMinutes: Number.isNaN(runtime) ? null : runtime,
    genres,
    cast,
    castPeople,
    director,
    certification,
    tagline: null,
    backdropUrl: null,
    source: 'omdb'
  };
}

function getTmdbCertification(releaseDatesPayload) {
  const results = Array.isArray(releaseDatesPayload?.results) ? releaseDatesPayload.results : [];
  const usEntry = results.find((entry) => entry?.iso_3166_1 === 'US');
  const preferredEntries = usEntry ? [usEntry, ...results.filter((entry) => entry !== usEntry)] : results;

  for (const entry of preferredEntries) {
    const releases = Array.isArray(entry?.release_dates) ? entry.release_dates : [];
    const match = releases.find((item) => normalizeWhitespace(item?.certification));
    if (match?.certification) {
      return normalizeWhitespace(match.certification);
    }
  }

  return null;
}

function mapTmdbResult(result) {
  const tmdbImageBase = process.env.TMDB_IMAGE_BASE || 'https://image.tmdb.org/t/p/w500';
  const tmdbCastImageBase = process.env.TMDB_CAST_IMAGE_BASE || 'https://image.tmdb.org/t/p/w185';
  if (!result) return null;

  const yearMatch = `${result.release_date || ''}`.match(/^\d{4}/);
  const year = yearMatch ? parseInt(yearMatch[0], 10) : null;
  const rating = Number(result.vote_average);
  const releaseDate = result.release_date || null;
  const runtime = Number(result.runtime);
  const voteCount = Number(result.vote_count);
  const genres = Array.isArray(result.genres)
    ? result.genres.map((genre) => normalizeWhitespace(genre?.name)).filter(Boolean)
    : [];
  const castPeople = Array.isArray(result?.credits?.cast)
    ? result.credits.cast
      .map((member) => {
        const name = normalizeWhitespace(member?.name);
        if (!name) return null;
        return {
          name,
          profileUrl: member?.profile_path ? `${tmdbCastImageBase}${member.profile_path}` : null
        };
      })
      .filter(Boolean)
      .slice(0, 8)
    : [];
  const cast = castPeople.map((member) => member.name);
  const directorCrew = Array.isArray(result?.credits?.crew)
    ? result.credits.crew.find((member) => normalizeWhitespace(member?.job) === 'Director')
    : null;
  const director = normalizeWhitespace(directorCrew?.name) || null;
  const certification = getTmdbCertification(result.release_dates);
  const tagline = normalizeWhitespace(result.tagline) || null;

  return {
    title: result.title || null,
    year: Number.isNaN(year) ? null : year,
    plot: result.overview || null,
    posterUrl: result.poster_path ? `${tmdbImageBase}${result.poster_path}` : null,
    imdbRating: Number.isNaN(rating) ? null : Number(rating.toFixed(1)),
    voteCount: Number.isNaN(voteCount) ? null : voteCount,
    releaseDate,
    runtimeMinutes: Number.isNaN(runtime) ? null : runtime,
    genres,
    cast,
    castPeople,
    director,
    certification,
    tagline,
    backdropUrl: result.backdrop_path ? `${tmdbImageBase}${result.backdrop_path}` : null,
    source: 'tmdb'
  };
}

function hasProviderConfigured() {
  const provider = (process.env.METADATA_PROVIDER || 'omdb').toLowerCase();
  if (provider === 'tmdb') {
    return Boolean(process.env.TMDB_API_KEY);
  }
  return Boolean(process.env.OMDB_API_KEY);
}

async function fetchFromOmdb(parsed) {
  const omdbApiBase = process.env.OMDB_API_BASE || 'https://www.omdbapi.com/';
  const omdbRequestTimeoutMs = Math.max(1000, parseInt(process.env.OMDB_REQUEST_TIMEOUT_MS || '5000', 10));
  const url = new URL(omdbApiBase);
  url.searchParams.set('apikey', process.env.OMDB_API_KEY);
  url.searchParams.set('t', parsed.title);
  if (parsed.year) {
    url.searchParams.set('y', `${parsed.year}`);
  }

  const data = await fetchJsonWithTimeout(url.toString(), omdbRequestTimeoutMs);
  return mapOmdbResult(data);
}

async function fetchFromTmdb(parsed) {
  const tmdbApiBase = process.env.TMDB_API_BASE || 'https://api.themoviedb.org';
  const tmdbRequestTimeoutMs = Math.max(1000, parseInt(process.env.TMDB_REQUEST_TIMEOUT_MS || '5000', 10));
  const url = new URL('/3/search/movie', tmdbApiBase);
  url.searchParams.set('api_key', process.env.TMDB_API_KEY);
  url.searchParams.set('query', parsed.title);
  url.searchParams.set('include_adult', 'false');
  if (parsed.year) {
    url.searchParams.set('primary_release_year', `${parsed.year}`);
  }

  const data = await fetchJsonWithTimeout(url.toString(), tmdbRequestTimeoutMs);
  const firstResult = Array.isArray(data?.results) ? data.results[0] : null;
  if (!firstResult?.id) return null;

  const detailsUrl = new URL(`/3/movie/${firstResult.id}`, tmdbApiBase);
  detailsUrl.searchParams.set('api_key', process.env.TMDB_API_KEY);
  detailsUrl.searchParams.set('append_to_response', 'credits,release_dates');
  const details = await fetchJsonWithTimeout(detailsUrl.toString(), tmdbRequestTimeoutMs);
  return mapTmdbResult(details);
}

export async function lookupMetadataForVideoKey(videoKey) {
  if (!hasProviderConfigured()) return null;
  const provider = (process.env.METADATA_PROVIDER || 'omdb').toLowerCase();

  const parsed = extractTitleAndYear(videoKey);
  if (!parsed) return null;

  try {
    if (provider === 'tmdb') {
      return await fetchFromTmdb(parsed);
    }
    return await fetchFromOmdb(parsed);
  } catch (error) {
    console.warn(`[metadata] lookup failed for "${videoKey}": ${error.message}`);
    return null;
  }
}
