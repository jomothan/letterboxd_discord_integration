import 'dotenv/config';
import { Client, GatewayIntentBits, Collection } from 'discord.js';
import { logCommand } from './commands/log.js';
import { profileCommand } from './commands/profile.js';

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

// Register commands
client.commands = new Collection();
client.commands.set('log', logCommand);
client.commands.set('profile', profileCommand);

client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  console.log(`📽️  Letterboxd bot is ready!`);
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(`Error executing /${interaction.commandName}:`, error);
    const errorMsg = { content: '❌ Something went wrong. Please try again.', ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(errorMsg);
    } else {
      await interaction.reply(errorMsg);
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
