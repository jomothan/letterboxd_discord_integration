import 'dotenv/config';
import { REST, Routes, SlashCommandBuilder } from 'discord.js';

const commands = [
  new SlashCommandBuilder()
    .setName('log')
    .setDescription('Log a film you watched to Letterboxd')
    .addStringOption((option) =>
      option
        .setName('entry')
        .setDescription('Describe what you watched, e.g. "Watched Dune Part Two last night, 4.5 stars"')
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('profile')
    .setDescription('Link your Letterboxd account to this bot')
    .addStringOption((option) =>
      option.setName('username').setDescription('Your Letterboxd username').setRequired(true)
    )
    .addStringOption((option) =>
      option.setName('password').setDescription('Your Letterboxd password (sent privately)').setRequired(true)
    ),
].map((cmd) => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log('🔄 Registering slash commands...');
    await rest.put(Routes.applicationCommands(process.env.DISCORD_CLIENT_ID), { body: commands });
    console.log('✅ Slash commands registered successfully!');
  } catch (error) {
    console.error('Failed to register commands:', error);
  }
})();
