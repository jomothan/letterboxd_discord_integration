import { EmbedBuilder } from 'discord.js';
import { parseFilmEntry } from '../services/parser.js';
import { searchMovie } from '../services/tmdb.js';
import { logToLetterboxd } from '../services/letterboxd.js';

function starsDisplay(rating) {
  if (rating === null) return 'No rating';
  const full = Math.floor(rating);
  const half = rating % 1 !== 0;
  return '★'.repeat(full) + (half ? '½' : '') + ` (${rating}/5)`;
}

export const logCommand = {
  async execute(interaction) {
    await interaction.deferReply();

    const input = interaction.options.getString('entry');

    // 1. Parse the input
    let parsed;
    try {
      parsed = parseFilmEntry(input);
    } catch (err) {
      return interaction.editReply(`❌ ${err.message}`);
    }

    // 2. Look up the film on TMDB
    let film;
    try {
      film = await searchMovie(parsed.movie, parsed.year);
    } catch (err) {
      return interaction.editReply(`❌ ${err.message}`);
    }

    // 3. Log to Letterboxd
    let result;
    try {
      result = await logToLetterboxd({
        filmSlug: film.letterboxdSlug,
        filmTitle: film.title,
        filmYear: film.year,
        rating: parsed.rating,
        review: parsed.review,
        liked: parsed.liked,
        
      });
    } catch (err) {
      return interaction.editReply(`❌ Letterboxd error: ${err.message}`);
    }

    // 4. Reply with a confirmation embed
    const embed = new EmbedBuilder()
      .setColor(0x00c030)
      .setTitle(`✅ Logged to Letterboxd`)
      .setDescription(`**[${film.title} (${film.year})](${result.filmUrl})**`)
      .addFields(
        { name: '⭐ Rating', value: starsDisplay(parsed.rating), inline: true },
        { name: '📅 Date', value: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }), inline: true }
      )
      .setFooter({ text: `Logged by ${interaction.user.username}` })
      .setTimestamp();

    if (film.posterUrl) embed.setThumbnail(film.posterUrl);
    if (parsed.review) embed.addFields({ name: '📝 Review', value: parsed.review });
    if (parsed.liked) embed.addFields({ name: '❤️ Liked', value: 'Yes', inline: true });

    await interaction.editReply({ embeds: [embed] });
  },
};
