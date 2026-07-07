import cron from 'node-cron';
import { exec } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const mlPipelinePath = path.join(__dirname, '..', 'services', 'ml-pipeline');
const runScriptPath = path.join(mlPipelinePath, 'run_pipeline.py');

/**
 * Run a pipeline command and log the result.
 * @param {string} command  Full python command to execute
 * @param {string} label    Human-readable label for logging
 */
const runPipeline = (command, label) => {
  console.log(`[Cron] Starting ${label}...`);

  // PYTHONIOENCODING=utf-8 avoids UnicodeEncodeError on Windows cp1252 terminals
  const env = { ...process.env, PYTHONIOENCODING: 'utf-8' };

  exec(
    command,
    { cwd: mlPipelinePath, maxBuffer: 1024 * 1024 * 20, env },
    (error, stdout, stderr) => {
      if (error) {
        console.error(`[Cron] ${label} ERROR: ${error.message}`);
        if (stderr) console.error(`[Cron] stderr: ${stderr.slice(0, 2000)}`);
        return;
      }
      // Only log the last 100 lines to avoid flooding logs
      const lines = stdout.split('\n');
      const tail  = lines.slice(-100).join('\n');
      console.log(`[Cron] ${label} output (tail):\n${tail}`);
      console.log(`[Cron] ${label} completed successfully.`);
    }
  );
};

export const startAIPredictionCron = () => {
  // ── Daily Fast Refresh: 6:45 AM IST (Mon–Sat) ──────────────────────────
  // Skips model training (uses saved models) but refreshes:
  //   • Live prices from Supabase/Agmarknet cache
  //   • Actuals from Agmarknet API
  //   • Forecast series (charts & graphs)
  //   • AI reasoning text (7/30/90-day for all grains)
  cron.schedule(
    '15 1 * * 1-6',   // 01:15 UTC = 06:45 IST, Monday–Saturday
    () => {
      runPipeline(
        `python -u "${runScriptPath}" --skip-training --no-tune`,
        'Daily Price Refresh (skip-training)'
      );
    },
    { timezone: 'UTC' }
  );

  // ── Weekly Full Retrain: Sunday 2:00 AM IST ─────────────────────────────
  // Runs the complete pipeline including incremental model retraining with
  // the latest week of real mandi data.
  cron.schedule(
    '30 20 * * 0',    // 20:30 UTC Saturday = 02:00 IST Sunday
    () => {
      runPipeline(
        `python -u "${runScriptPath}" --incremental-train --no-tune`,
        'Weekly Incremental Model Retrain'
      );
    },
    { timezone: 'UTC' }
  );

  console.log(
    'AI Prediction cron jobs scheduled:\n' +
    '  Daily Price Refresh:  Mon-Sat at 06:45 IST (--skip-training)\n' +
    '  Weekly Model Retrain: Sunday at 02:00 IST (--incremental-train)'
  );
};
