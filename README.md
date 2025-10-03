# Discord Response Bot

A professional Discord support ticket system with smart AI assistance.

## Features

- 🎫 Advanced ticket system with multiple support categories
- 🤖 Smart AI assistant for instant help
- ⭐ Review and vouch system
- 🔔 Staff notification system
- 📊 Priority ticket management
- 🔒 Secure permissio```markdown file="README.md"
# Discord Response Bot

A professional Discord support ticket system with smart AI assistance.

## Features

- 🎫 Advanced ticket system with multiple support categories
- 🤖 Smart AI assistant for instant help
- ⭐ Review and vouch system
- 🔔 Staff notification system
- 📊 Priority ticket management
- 🔒 Secure permission handling

## ⚠️ Important: Git History Issue?

If GitHub is blocking your push due to secrets in history, see **[GIT-CLEANUP-GUIDE.md](./GIT-CLEANUP-GUIDE.md)** for step-by-step instructions to fix it.

## Setup Instructions

### 1. Install Dependencies

\`\`\`bash
npm install
# or
pnpm install
\`\`\`

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your Discord bot credentials:

\`\`\`bash
cp .env.example .env
\`\`\`

Edit `.env` with your actual values:
- Get your bot token from [Discord Developer Portal](https://discord.com/developers/applications)
- Find IDs by enabling Developer Mode in Discord settings

### 3. Run the Bot

**Development:**
\`\`\`bash
npm run dev
\`\`\`

**Production:**
\`\`\`bash
npm start
\`\`\`

## Deployment to Railway

1. **Clean your git history** (if you had secrets before):
   - See [GIT-CLEANUP-GUIDE.md](./GIT-CLEANUP-GUIDE.md) for instructions
   
2. **Push to GitHub** (secrets are now safe!):
   \`\`\`bash
   git add .
   git commit -m "Initial commit"
   git push -u origin main
   \`\`\`

3. **Deploy to Railway**:
   - Connect your GitHub repo to Railway
   - Add all environment variables from `.env.example` in Railway's settings
   - Railway will automatically run `npm start`

## Environment Variables

See `.env.example` for all required environment variables.

## Support Categories

- 💬 Customer Support
- ⚙️ Software Setup
- 🔄 Hardware Reset
- 💳 Payment Issues
- 🤝 Reselling

## Commands

- `!response [question]` - Ask the AI assistant
- `!botinfo` - View bot statistics
- `!support` - Deploy support menu (admin only)

## Security

- Never commit `.env` file
- Keep your bot token secret
- Regularly rotate webhook URLs
- Use environment variables for all secrets
