const TMDB_BASE = 'https://api.themoviedb.org/3';

/**
 * Search TMDB for a film by title.
 * Returns the best match with id, title, year, and poster.
 *
 * @param {string} title - Movie title from the parser
 * @returns {Promise<{id: number, title: string, year: string, posterUrl: string|null, letterboxdSlug: string}>}
 */
export async function searchMovie(title, year = null) {
  let url = `${TMDB_BASE}/search/movie?query=${encodeURIComponent(title)}&api_key=${process.env.TMDB_API_KEY}`;
  if (year) url += `&year=${year}`;
  
  const res = await fetch(url);
  if (!res.ok) throw new Error(`TMDB error: ${res.status}`);
  const data = await res.json();

  if (!data.results || data.results.length === 0) {
    throw new Error(`No film found for "${title}". Check the title and try again.`);
  }

  const film = data.results[0];
  const filmYear = film.release_date ? film.release_date.slice(0, 4) : 'Unknown';
  const posterUrl = film.poster_path
    ? `https://image.tmdb.org/t/p/w200${film.poster_path}`
    : null;

  const letterboxdSlug = buildLetterboxdSlug(film.title, filmYear);

  return {
    id: film.id,
    title: film.title,
    year: filmYear,
    posterUrl,
    letterboxdSlug,
  };
}

/**
 * Build a Letterboxd-compatible slug from a title and year.
 * Letterboxd slugs are lowercase, hyphenated, with special chars removed.
 * If there's a duplicate title by year, Letterboxd appends the year — we handle that in the Playwright service.
 */
function buildLetterboxdSlug(title, year) {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // remove special chars
    .trim()
    .replace(/\s+/g, '-');       // spaces to hyphens

  return slug;
}
