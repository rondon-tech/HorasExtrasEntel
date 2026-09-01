/**
 * A1 enrichment job — adjusts open anomaly scores using the JSON model.
 *
 * Usage: npx tsx scripts/enrich-anomalies.mjs [--dry-run] [--max N]
 * Intended for cron (GitHub Actions / Vercel Cron). Safe to re-run:
 * only enriches anomalies still marked 'open' without an IA marker.
 */
import fs from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const ROOT_URL = pathToFileURL(ROOT + (ROOT.endsWith('/') || ROOT.endsWith('\\') ? '' : '/')).href;
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

for (const line of fs.readFileSync(`${ROOT}/.env`, 'utf8').split(/\r?\n/)) {
  const m = /^([A-Z_]+)="?([^"#]*)"?$/.exec(line.trim());
  if (m && !(m[1] in process.env)) process.env[m[1]] = m[2];
}

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const maxArg = Number(args.find((a) => a.startsWith('--max='))?.split('=')[1]) || 20;

const { pool } = await import(`${ROOT_URL}server/config/db.js`);
const { enrichAnomalyWithLLM } = await import(`${ROOT_URL}server/agents/anomaly.js`);
const { logAudit } = await import(`${ROOT_URL}server/utils/audit.js`);

const { rows: anomalies } = await pool.query(
  `SELECT a.id, a.record_id, a.user_id, a.type, a.score, a.reasons,
          r.date::text AS date, r.start_time::text AS start_time, r.end_time::text AS end_time,
          r.day_type, r.extra_hours,
          (SELECT COALESCE(SUM(r2.extra_hours), 0) FROM records r2
           WHERE r2.user_id = a.user_id
             AND r2.id <> a.record_id
             AND date_trunc('month', r2.date) = date_trunc('month', r.date)) AS month_total
   FROM agent_anomalies a
   JOIN records r ON r.id = a.record_id
   WHERE a.status = 'open'
     AND NOT (a.reasons::text LIKE '%Score ajustado por revisión IA%')
   ORDER BY a.score DESC
   LIMIT $1`,
  [maxArg]
);

console.log(`Anomalías abiertas sin enriquecer: ${anomalies.length}${dryRun ? ' (dry-run)' : ''}`);

let enriched = 0;
for (const a of anomalies) {
  const enrichedList = await enrichAnomalyWithLLM({
    record: {
      date: a.date,
      startTime: a.start_time.slice(0, 5),
      endTime: a.end_time.slice(0, 5),
      dayType: a.day_type,
      extraHours: Number(a.extra_hours),
    },
    monthTotal: Number(a.month_total),
    anomalies: [{ type: a.type, score: Number(a.score), reasons: a.reasons }],
  });

  const adjusted = enrichedList[0];
  if (adjusted && adjusted.score !== Number(a.score)) {
    if (!dryRun) {
      await pool.query(
        'UPDATE agent_anomalies SET score = $1, reasons = $2 WHERE id = $3',
        [adjusted.score, JSON.stringify(adjusted.reasons), a.id]
      );
      await logAudit({
        action: 'AGENT_ENRICH',
        entity: 'agent_anomalies',
        entityId: a.id,
        changedBy: 'system:agent-a1',
        userId: a.user_id,
      });
    }
    enriched++;
    console.log(`  ${a.type} score ${a.score} -> ${adjusted.score} (record ${a.record_id.slice(0, 8)}...)`);
  }
}

console.log(`Enriquecidas: ${enriched}/${anomalies.length}`);
process.exit(0);
