const fs = require('fs');
const path = require('path');
const os = require('os');

const channelInfo = {
    contextInfo: {
        forwardingScore: 999,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
            newsletterJid: '120363420656466131@newsletter',
            newsletterName: 'Lucky Tech Hub Bot',
            serverMessageId: -1
        }
    }
};

async function clearSessionCommand(sock, chatId, msg) {
    try {
        // Check if sender is owner
        if (!msg.key.fromMe) {
            await sock.sendMessage(chatId, { 
                text: '\u274c This command can only be used by the owner!',
                ...channelInfo
            });
            return;
        }

        // Define session directory
        const sessionDir = path.join(__dirname, '../session');
        const backupDir = path.join(__dirname, '../session-backup');

        if (!fs.existsSync(sessionDir)) {
            await sock.sendMessage(chatId, { 
                text: '\u274c Session directory not found!',
                ...channelInfo
            });
            return;
        }

        // Create backup directory if it doesn't exist
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }

        // Create timestamped backup directory
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupSessionDir = path.join(backupDir, `backup-${timestamp}`);
        fs.mkdirSync(backupSessionDir, { recursive: true });

        let filesCleared = 0;
        let filesBackedUp = 0;
        let errors = 0;
        let errorDetails = [];

        // Send initial status
        await sock.sendMessage(chatId, { 
            text: `🔄 Clearing session files to fix connection issues...`,
            ...channelInfo
        });

        const files = fs.readdirSync(sessionDir);
        
        // Count files by type
        let sessionFileCount = 0;
        let credsFileCount = 0;
        let otherFileCount = 0;

        for (const file of files) {
            if (file.startsWith('session-')) sessionFileCount++;
            else if (file === 'creds.json') credsFileCount++;
            else if (file !== 'upload creds file here') otherFileCount++;
        }

        // Backup and delete files
        for (const file of files) {
            if (file === 'upload creds file here') {
                // Skip placeholder file
                continue;
            }

            try {
                const filePath = path.join(sessionDir, file);
                const stats = fs.statSync(filePath);
                
                if (stats.isDirectory()) {
                    continue; // Skip directories
                }
                
                // Backup the file
                const backupPath = path.join(backupSessionDir, file);
                fs.copyFileSync(filePath, backupPath);
                filesBackedUp++;
                
                // Delete the original file
                fs.unlinkSync(filePath);
                filesCleared++;
            } catch (error) {
                errors++;
                errorDetails.push(`Failed to process ${file}: ${error.message}`);
            }
        }

        // Create placeholder file if it doesn't exist
        const placeholderPath = path.join(sessionDir, 'upload creds file here');
        if (!fs.existsSync(placeholderPath)) {
            fs.writeFileSync(placeholderPath, '');
        }

        // Send completion message
        const message = `✅ Session files cleared successfully!\n\n` +
                       `📊 Statistics:\n` +
                       `• Files backed up: ${filesBackedUp}\n` +
                       `• Files cleared: ${filesCleared}\n` +
                       `• Session files: ${sessionFileCount}\n` +
                       `• Credentials files: ${credsFileCount}\n` +
                       `• Other files: ${otherFileCount}\n` +
                       `• Backup location: ${backupSessionDir}\n\n` +
                       `⚠️ IMPORTANT: You will need to restart the bot and scan a new QR code.\n` +
                       (errors > 0 ? `\n⚠️ Errors encountered: ${errors}\n${errorDetails.join('\n')}` : '');

        await sock.sendMessage(chatId, { 
            text: message,
            ...channelInfo
        });

    } catch (error) {
        console.error('Error in clearsession command:', error);
        await sock.sendMessage(chatId, { 
            text: '\u274c Failed to clear session files!',
            ...channelInfo
        });
    }
}

module.exports = clearSessionCommand;