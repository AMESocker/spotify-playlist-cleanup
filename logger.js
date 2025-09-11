// File: logger.js
export function logInfo(message) {
  console.log(`[INFO] ${new Date().toISOString()} - ${message}`);
}
export function logError(message, err) {
  console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, err);
}