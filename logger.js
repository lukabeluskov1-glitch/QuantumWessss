function log(message, level = 'info') {
  const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
  const prefix = level === 'error' ? '❌' : level === 'warn' ? '⚠️ ' : 'ℹ️ ';
  console.log(`[${timestamp}] ${prefix} ${message}`);
}

module.exports = { log };
