#!/bin/bash

# Stop the bot if it's running
echo "🛑 Stopping the bot (if running)..."
pkill -f "node index.js" || echo "Bot was not running"

# Clear the session
echo "🧹 Clearing session files..."
node clear-session.js

# Restart the bot
echo "🚀 Restarting the bot..."
echo "⚠️ IMPORTANT: You will need to scan a new QR code when the bot starts."
echo "Press Enter to start the bot, or Ctrl+C to cancel..."
read -r

# Start the bot in the background
nohup node index.js > bot.log 2>&1 &

echo "✅ Bot started! Check bot.log for the QR code."
echo "You can view the log with: tail -f bot.log"