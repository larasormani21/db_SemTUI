import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: './db/.env' });

const pool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT,
});

export default pool;
export * from './users.js';
export * from './datasets.js';
export * from './tables.js';
export * from './column.js';
export * from './cells.js';
