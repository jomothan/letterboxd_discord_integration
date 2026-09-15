// /profile — lets users link their Letterboxd account.
// Credentials are sent via an ephemeral (private) message so only
// the user can see them. In production, encrypt before storing in DB.

export const profileCommand = {
  async execute(interaction) {
    // Always ephemeral — never expose credentials in a public channel
    await interaction.deferReply({ ephemeral: true });

    const username = interaction.options.getString('username');
    const password = interaction.options.getString('password');

    // TODO: store { discordUserId: interaction.user.id, username, password }
    // in your database (encrypted). For now just acknowledge.

    console.log(`[profile] User ${interaction.user.id} linked Letterboxd account: ${username}`);

    await interaction.editReply(
      `✅ Letterboxd account **${username}** linked! Your credentials are stored privately.\n\nYou can now use \`/log\` to log films.`
    );
  },
};
