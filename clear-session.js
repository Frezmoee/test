/**
 * Session Clearing Script
 * This script clears WhatsApp session files to fix decryption errors and session conflicts
 */

const fs = require('fs');
const path = require('path');

// Configuration
const SESSION_DIR = path.join(process.cwd(), 'session');
const BACKUP_DIR = path.join(process.cwd(), 'session-backup');

// Create backup directory if it doesn't exist
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  console.log(`✅ Created backup directory: ${BACKUP_DIR}`);
}

// Get current timestamp for backup folder name
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupSessionDir = path.join(BACKUP_DIR, `backup-${timestamp}`);

// Create timestamped backup directory
fs.mkdirSync(backupSessionDir, { recursive: true });
console.log(`✅ Created timestamped backup directory: ${backupSessionDir}`);

// Check if session directory exists
if (!fs.existsSync(SESSION_DIR)) {
  console.log(`❌ Session directory not found: ${SESSION_DIR}`);
  process.exit(1);
}

// Read all files in the session directory
const sessionFiles = fs.readdirSync(SESSION_DIR);
console.log(`📂 Found ${sessionFiles.length} files in session directory`);

// Backup and remove each session file
let backupCount = 0;
let deleteCount = 0;

sessionFiles.forEach(file => {
  // Skip directories and the placeholder file
  const filePath = path.join(SESSION_DIR, file);
  const stats = fs.statSync(filePath);
  
  if (stats.isDirectory() || file === 'upload creds file here') {
    console.log(`⏭️ Skipping: ${file}`);
    return;
  }
  
  // Backup the file
  const backupPath = path.join(backupSessionDir, file);
  fs.copyFileSync(filePath, backupPath);
  backupCount++;
  console.log(`📑 Backed up: ${file}`);
  
  // Delete the original file
  fs.unlinkSync(filePath);
  deleteCount++;
  console.log(`🗑️ Deleted: ${file}`);
});

// Create placeholder file if it doesn't exist
const placeholderPath = path.join(SESSION_DIR, 'upload creds file here');
if (!fs.existsSync(placeholderPath)) {
  fs.writeFileSync(placeholderPath, '');
  console.log(`📄 Created placeholder file`);
}

console.log(`\n✅ Session clearing complete!`);
console.log(`📊 Summary:`);
console.log(`   - Backed up ${backupCount} files to: ${backupSessionDir}`);
console.log(`   - Deleted ${deleteCount} files from: ${SESSION_DIR}`);
console.log(`\n⚠️ IMPORTANT: You will need to scan a new QR code when you restart the bot.`);