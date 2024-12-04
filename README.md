# HN Discord Bot

A Cloudflare Worker that posts popular Hacker News stories to Discord. It monitors the HN frontpage and posts stories that reach 150+ points to your Discord channel.

## Features

- 🔥 Posts hot stories (reached threshold within 4 hours)
- ❄️ Marks old but popular stories (took over 2 days to reach threshold)
- 📊 Includes story score and comment count
- 🔗 Direct links to both story and comments
- 🎯 Prevents duplicate posts
- ⚡ Runs every 30 minutes (or whatever interval you like)
- 💰 Runs on Cloudflare Workers free tier

## Setup

### Prerequisites

- Node.js installed on your machine
- A Cloudflare account (free)
- A Discord server where you can create webhooks

### Installation

1. Clone this repository
```bash
git clone https://github.com/yourusername/hn-discord-bot.git
cd hn-discord-bot
```

2. Install dependencies
```bash
npm install
```

3. Create a Discord webhook:
- Go to your Discord server
- Right-click the channel where you want the bot to post
- Select "Edit Channel"
- Click "Integrations"
- Click "Create Webhook"
- Give it a name (e.g., "HN Bot")
- Copy the webhook URL

4. Set up Cloudflare:
```bash
# Login to Cloudflare
wrangler login

# Create KV namespace for storing processed stories
wrangler kv:namespace create HN_POSTS
```

5. Configure the worker:
- Copy `wrangler.example.toml` to `wrangler.toml`
```bash
cp wrangler.example.toml wrangler.toml
```
- Set your Discord webhook URL as a secret:
- Update `wrangler.toml` with your KV namespace ID from step 4
```bash
wrangler secret put DISCORD_WEBHOOK_URL
```

6. Deploy:
```bash
npm run deploy
```

## Development

To run locally:
```bash
npm run dev
```

Note: Local development still requires the Cloudflare KV namespace and Discord webhook URL to be configured.

## How It Works

1. The worker runs every 10 minutes via Cloudflare's cron trigger
2. It fetches the top 100 stories from Hacker News
3. For each story:
   - Checks if it has already been processed (using KV storage)
   - Verifies if it meets the score threshold (150+ points)
   - Creates a formatted Discord message with the story details
   - Posts to Discord via webhook if all criteria are met
4. Stories are marked as processed for 7 days to prevent duplicates

## Configuration

- `SCORE_THRESHOLD`: Minimum points needed (default: 150)
- Cron schedule: Set in `wrangler.toml` (default: every 10 minutes)
- Story expiration: 7 days (set in `processStory` function)

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
