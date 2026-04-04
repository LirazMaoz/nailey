import pg from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const { Pool } = pg;
export const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function runMigrations() {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const sql = readFileSync(path.join(__dirname, '../../../docker/init.sql'), 'utf8');
  try {
    await pool.query(sql);
    console.log('Migrations applied');
  } catch (err) {
    console.error('Migration error:', err.message);
  }
}
