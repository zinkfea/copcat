# Git Cleanup Guide - Remove Secret from History

GitHub is blocking your push because an old commit still contains the hardcoded Discord token. Even though the current code is clean, the secret exists in your git history.

## Quick Fix: Start Fresh (Recommended)

This is the easiest solution since this is a new project:

### Step 1: Backup your current code
\`\`\`cmd
# Make sure you're in C:\Users\snub\Desktop\discord
# Your current files are already saved, but just to be safe
\`\`\`

### Step 2: Delete the git history
\`\`\`cmd
# Delete the .git folder (this removes all git history)
rmdir /s /q .git
\`\`\`

### Step 3: Initialize a fresh repository
\`\`\`cmd
# Start a new git repository
git init

# Add all files (they now use environment variables, so they're safe)
git add .

# Create your first commit
git commit -m "Initial commit - Discord bot with environment variables"
\`\`\`

### Step 4: Push to GitHub

**Option A: Use the existing repository (if you want to keep the same URL)**
\`\`\`cmd
# Add your remote (it might say it already exists, that's okay)
git remote add origin https://github.com/zinkfea/Bot.git

# Force push to replace everything
git push -u origin main --force
\`\`\`

**Option B: Create a new repository (recommended for a clean start)**
1. Go to https://github.com/new
2. Create a new repository (e.g., "discord-bot-clean")
3. Run these commands:
\`\`\`cmd
git remote add origin https://github.com/YOUR_USERNAME/YOUR_NEW_REPO.git
git branch -M main
git push -u origin main
\`\`\`

---

## Alternative: Remove Secret from History (Advanced)

If you want to keep your existing commits, you need to rewrite history:

\`\`\`cmd
# Install BFG Repo-Cleaner (requires Java)
# Download from: https://rtyley.github.io/bfg-repo-cleaner/

# Or use git filter-branch (slower but built-in)
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch scripts/discord-bot.js" \
  --prune-empty --tag-name-filter cat -- --all

# Then force push
git push origin main --force
\`\`\`

---

## After Pushing Successfully

1. **Set up environment variables in Railway:**
   - Go to your Railway project
   - Add all the environment variables from `.env.example`
   - Your bot will run securely without exposing secrets

2. **Never commit secrets again:**
   - Always use `.env` for local development
   - Always use environment variables in Railway/production
   - The `.env` file is already in `.gitignore` so it won't be committed

---

## Need Help?

If you're still having issues:
1. Make sure you deleted the `.git` folder completely
2. Make sure you're using the latest code (with `process.env` variables)
3. Consider creating a brand new GitHub repository for a clean start
