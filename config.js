const fs = require('fs');
const path = require('path');

const CONFIG_FILE = path.join(__dirname, '../data/config.json');

let config = {
  channelId: process.env.CHANNEL_ID || null,
  disabledCategories: [],
  pingRoleId: null,
};

function loadConfig() {
  try {
    fs.mkdirSync(path.join(__dirname, '../data'), { recursive: true });
    const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
    config = { ...config, ...JSON.parse(raw) };
  } catch {
    // Use defaults
  }
}

function saveConfig() {
  try {
    fs.mkdirSync(path.join(__dirname, '../data'), { recursive: true });
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
  } catch (err) {
    console.error('[Config] Save failed:', err.message);
  }
}

function getConfig() {
  return config;
}

function updateConfig(partial) {
  config = { ...config, ...partial };
  saveConfig();
}

loadConfig();

module.exports = { getConfig, updateConfig };
