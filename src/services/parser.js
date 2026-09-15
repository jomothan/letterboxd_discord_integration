/**
 * Parse a basic film log entry.
 *
 * Supported formats:
 *   /log star wars
 *   /log star wars 4.5
 *   /log star wars 4.5 "great film"
 *
 * @param {string} input - Raw string from the Discord command option
 * @returns {{ movie: string, rating: number|null, review: string|null }}
 */
export function parseFilmEntry(input) {
  let remaining = input.trim();

  // 1. Extract optional review in quotes
  let review = null;
  const reviewMatch = remaining.match(/[\u0022\u0027\u00AB\u00BB\u2018\u2019\u201A\u201B\u201C\u201D\u201E\u201F\u2039\u203A](.+?)[\u0022\u0027\u00AB\u00BB\u2018\u2019\u201A\u201B\u201C\u201D\u201E\u201F\u2039\u203A]$/);
  if (reviewMatch) {
    review = reviewMatch[1].trim();
    remaining = remaining.slice(0, reviewMatch.index).trim();
  }

  if (review) {
    review = review.replace(/^[\u0022\u0027\u00AB\u00BB\u2018\u2019\u201A\u201B\u201C\u201D\u201E\u201F\u2039\u203A]+|[\u0022\u0027\u00AB\u00BB\u2018\u2019\u201A\u201B\u201C\u201D\u201E\u201F\u2039\u203A]+$/g, '').trim();
  }

  // 2. Extract optional "like" flag BEFORE rating
  let liked = false;
  if (remaining.toLowerCase().endsWith(' like')) {
    liked = true;
    remaining = remaining.slice(0, -5).trim();
  }

  // 3. Extract optional rating
  let rating = null;
  const ratingMatch = remaining.match(/\b(\d(?:\.\d)?)\s*$/);
  if (ratingMatch) {
    const raw = parseFloat(ratingMatch[1]);
    if (raw >= 0.5 && raw <= 5) {
      rating = Math.round(raw * 2) / 2;
      remaining = remaining.slice(0, ratingMatch.index).trim();
    }
  }

  // 4. Everything left is the movie title
  let movie = remaining.trim();
  let year = null;

  // Extract optional year in parentheses e.g. "supergirl (2026)"
  const yearMatch = movie.match(/\((\d{4})\)$/);
  if (yearMatch) {
    year = yearMatch[1];
    movie = movie.slice(0, yearMatch.index).trim();
  }

  if (!movie) {
    throw new Error('No movie title found. Usage: `/log star wars` or `/log star wars 4.5 "great film"`');
  }

  return { movie, rating, review, liked, year };
}
