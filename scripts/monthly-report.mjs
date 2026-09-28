/**
 * A4 scheduled monthly report — generates the executive report and saves it
 * as a markdown file for the GitHub Actions artifact.
 *
 * Usage: npx tsx scripts/monthly-report.mjs [year month]
 */
import fs from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const ROOT_URL = pathToFileURL(ROOT.endsWith('/') || ROOT.endsWith('\\') ? ROOT : ROOT + '/').href;

process.env.NODE_ENV = process.env.NODE_ENV || 'development';
try {
  for (const line of fs.readFileSync(`${ROOT}/.env`, 'utf8').split(/\r?\n/)) {
    const m = /^([A-Z_]+)="?([^"#]*)"?$/.exec(line.trim());
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2];
  }
} catch { /* .env not found */ }

const year = Number(process.argv[2]) || new Date().getFullYear();
const month = Number(process.argv[3]) || new Date().getMonth() + 1;

const { generateGlobalMonthlyReport } = await import(`${ROOT_URL}server/agents/reports.js`);

const result = await generateGlobalMonthlyReport({ year, month, requesterId: null });
if (!result.ok) {
  console.error('REPORT_FAILED:', result.error);
  process.exit(1);
}

const outPath = `${ROOT}report-${year}-${String(month).padStart(2, '0')}.md`;
fs.writeFileSync(outPath, result.report);
console.log(`Report generated: ${outPath} (${result.report.length} chars, model ${result.model})`);
process.exit(0);