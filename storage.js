const fs = require('fs').promises;
const path = require('path');

const SEEN_FILE = path.join(__dirname, '../data/seen.json');
const seenItems = new Set();

async function ensureDir() {
  await fs.mkdir(path.join(__dirname, '../data'), { recursive: true });
}

async function loadSeen() {
  try {
    await ensureDir();
    const raw = await fs.readFile(SEEN_FILE, 'utf-8');
    const arr = JSON.parse(raw);
    arr.forEach(id => seenItems.add(id));
    console.log(`[Storage] Loaded ${seenItems.size} seen items.`);
  } catch {
    console.log('[Storage] No seen.json yet, starting fresh.');
  }
}

async function saveSeen() {
  try {
    await ensureDir();
    // Only keep the latest 5000 to prevent the file growing forever
    const arr = [...seenItems].slice(-5000);
    await fs.writeFile(SEEN_FILE, JSON.stringify(arr));
  } catch (err) {
    console.error('[Storage] Failed to save seen items:', err.message);
  }
}

function hasSeen(id) {
  return seenItems.has(id);
}

function markSeen(id) {
  seenItems.add(id);
}

module.exports = { loadSeen, saveSeen, hasSeen, markSeen };
