// File: scheduler.js
import cron from 'node-cron';
import { logInfo } from './logger.js';

export function scheduleDaily(jobFn) {
  cron.schedule('0 3 * * *', () => {
    logInfo('Daily cleanup (3 AM) at ' + new Date().toISOString());
    jobFn();
  });
  
  cron.schedule('0 13 * * *', () => {
    logInfo('Daily cleanup (1 PM) at ' + new Date().toISOString());
    jobFn();
  });
}

