# Letterboxd Discord Bot

Log films to Letterboxd directly from Discord.

## Usage

```
/log star wars
/log star wars 4.5
/log star wars 4.5 "one of the greatest films ever made"
```

## Setup

### 1. Prerequisites
- Node.js 18+
- A Discord application + bot token
- A free TMDB API key
- Your Letterboxd username and password

### 2. Create a Discord Bot
1. Go to https://discord.com/developers/applications
2. Click **New Application**, give it a name
3. Go to **Bot** → **Add Bot**
4. Copy the **Token** → this is your `DISCORD_TOKEN`
5. Go to **OAuth2** → copy the **Client ID** → this is your `DISCORD_CLIENT_ID`
6. Under **OAuth2 → URL Generator**, select `bot` + `applications.commands`, copy the URL and invite the bot to your server

### 3. Get a TMDB API Key
1. Sign up free at https://www.themoviedb.org
2. Go to **Settings → API** and request a key
3. Copy the **API Key (v3 auth)**

### 4. Install & Configure

```bash
cp .env.example .env
# Fill in DISCORD_TOKEN, DISCORD_CLIENT_ID, TMDB_API_KEY,
# LETTERBOXD_USERNAME, LETTERBOXD_PASSWORD
```

```bash
npm install
npx playwright install chromium
```

### 5. Register Slash Commands

```bash
npm run deploy-commands
```

This only needs to be run once (or when you add new commands).

### 6. Start the Bot

```bash
npm start
# or for development with auto-restart:
npm run dev
```

## Project Structure

```
src/
  index.js              # Bot entry point
  deploy-commands.js    # Registers slash commands with Discord
  commands/
    log.js              # /log command
    profile.js          # /profile command
  services/
    parser.js           # Parses "star wars 4.5 "great film"" → structured data
    tmdb.js             # Looks up films via TMDB API
    letterboxd.js       # Playwright automation for logging to Letterboxd
```

## Notes

- Letterboxd has no public write API, so the bot uses browser automation (Playwright) to log entries on your behalf.
- Credentials are stored in `.env` for single-user setups. For a public bot, store them encrypted in a database per Discord user ID.
- The `/profile` command always replies ephemerally (only visible to you) so your password is never shown in a channel.
