# WhatsApp Session Fix Guide

This guide will help you fix WhatsApp session issues that cause errors like:
- "Failed to decrypt message with any known session..."
- "Bad MAC Error"
- "Closing open session in favor of incoming prekey bundle"

## What's Happening?

Your bot is experiencing WhatsApp session conflicts or encryption issues. This happens when:
1. Multiple instances of the bot are running with the same WhatsApp account
2. The session files are corrupted
3. WhatsApp has invalidated your session

## How to Fix It

### Method 1: Using the Bot Command (Easiest)

If your bot is still connected and responding to commands:

1. Send the command `.clearsession` to your bot (must be sent by the owner)
2. Wait for confirmation that session files have been cleared
3. Restart your bot (stop and start it again)
4. Scan the new QR code that appears

### Method 2: Using the Script (If Bot is Not Responding)

If your bot is not responding to commands:

1. Stop your bot
2. Run the session clearing script:
   ```bash
   cd /path/to/your/bot
   node clear-session.js
   ```
3. Restart your bot
4. Scan the new QR code that appears

### Method 3: Manual Clearing (If All Else Fails)

1. Stop your bot
2. Navigate to your bot's session directory:
   ```bash
   cd /path/to/your/bot/session
   ```
3. Backup your session files (optional but recommended):
   ```bash
   mkdir -p ../session-backup/backup-$(date +%Y-%m-%d-%H-%M-%S)
   cp * ../session-backup/backup-$(date +%Y-%m-%d-%H-%M-%S)/
   ```
4. Delete all session files (except the placeholder):
   ```bash
   rm session-*.json
   ```
5. Restart your bot
6. Scan the new QR code that appears

## Preventing Future Issues

To prevent these issues from happening again:

1. **Avoid Multiple Instances**: Make sure you're not running multiple instances of the bot with the same WhatsApp account
2. **Proper Shutdown**: Always shut down your bot properly using the stop command or Ctrl+C
3. **Regular Maintenance**: Consider clearing session files periodically if you notice performance issues
4. **Update Baileys**: Make sure you're using the latest version of the Baileys library

## Need More Help?

If you continue to experience issues after following these steps, please:
1. Check the bot's logs for more specific error messages
2. Make sure your WhatsApp is up to date
3. Ensure your bot's code is up to date with the latest fixes