# 📡 Announcement Bot

Monitors the best anime, manga, and light novel news sources and posts clean, concise announcements to your Discord server — no article dumps, just the facts.

---

## 💬 What posts look like

Instead of pasting a whole article, the bot posts one clean sentence:

> **Frieren: Beyond Journey's End Sequel** has been officially announced and is scheduled for **Spring 2025**.

> **Dungeon Meshi** has been officially announced.

> **Solo Leveling Season 2** has been officially announced and is scheduled for **January 2025**.

If an image is included in the source article, it's attached automatically.

---

## ✨ Features

- **12 curated sources** — ANN, Crunchyroll, MAL, Funimation, HIDIVE, Otaku USA, Anime Corner, Anime Senpai, MangaUpdates, Viz, Yen Press, J-Novel Club
- **Announcement detection** — only posts actual announcements, not reviews or editorials
- **Sequel detection** — automatically labels sequels (e.g. "Solo Leveling **Sequel**")
- **Date extraction** — pulls airing/release dates from article text
- **Auto image** — grabs the article image if one exists
- **Persistent memory** — remembers what was posted even after restarts
- **Slash commands** — configure everything from Discord
- **Category toggles** — enable/disable anime, manga, light novels
- **Ping roles** — optionally ping a role for every new announcement
- **Checks every 10 minutes**

---

## 🚀 Setup

### 1 — Create your Discord bot

1. Go to **[discord.com/developers/applications](https://discord.com/developers/applications)**
2. Click **New Application** → name it
3. Go to **Bot** → **Add Bot** → copy the Token
4. Under **Privileged Gateway Intents**, enable:
   - ✅ Server Members Intent
   - ✅ Message Content Intent
5. Go to **OAuth2 → URL Generator**:
   - Check `bot` and `applications.commands`
   - Bot Permissions: `Send Messages`, `Embed Links`, `View Channels`
   - Copy the URL → paste in browser → invite to your server

### 2 — Install

Requires **Node.js 18+**: [nodejs.org](https://nodejs.org)

```bash
cd announcement-bot
npm install
cp .env.example .env
```

Edit `.env`:
```
DISCORD_TOKEN=your_token_here
CHANNEL_ID=your_channel_id_here
```

**Get your channel ID:** Discord Settings → Advanced → Enable Developer Mode → right-click channel → Copy Channel ID

### 3 — Run

```bash
npm start
```

### 4 — Keep running 24/7 (recommended)

```bash
npm install -g pm2
pm2 start index.js --name "announcement-bot"
pm2 save
pm2 startup
```

---

## 💬 Commands

| Command | What it does |
|---|---|
| `/setchannel` | Set which channel to post in |
| `/status` | View current settings |
| `/check` | Manually trigger a check right now |
| `/sources` | See all sources and their status |
| `/togglecategory` | Enable/disable anime, manga, or light novels |
| `/setpingrole` | Ping a role for every new announcement |
| `/help` | Show all commands |

---

## 📰 Sources

| Source | Category |
|---|---|
| Anime News Network | Anime |
| Crunchyroll News | Anime |
| MyAnimeList News | Anime |
| Funimation News | Anime |
| HIDIVE Blog | Anime |
| Otaku USA | Anime |
| Anime Corner | Anime |
| Anime Senpai | Anime |
| MangaUpdates | Manga |
| Viz Media | Manga |
| Yen Press | Light Novel |
| J-Novel Club | Light Novel |

---

## 🛠️ Troubleshooting

**Not posting anything:**
- Run `/setchannel` to set the channel
- Run `/check` to trigger manually and watch the console

**Old posts spammed on startup:**
- This shouldn't happen (bot seeds on first run)
- If it does, delete `data/seen.json` and restart

**Slash commands not showing:**
- Global commands can take up to 1 hour to appear
- Make sure `applications.commands` was checked in the invite URL
