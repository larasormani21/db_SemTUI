import pool from './index.js';

export async function getAllUsers() {
  const res = await pool.query('SELECT id, username, created_at FROM users');
  return res.rows;
}

export async function getUserById(id) {
  const res = await pool.query('SELECT id, username, created_at FROM users WHERE id = $1', [id]);
  return res.rows[0];
}

export async function getUserByUsername(username) {
  const res = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
  return res.rows[0];
}

export async function createUser(username, passwordHash) {
  const res = await pool.query(
    'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username, created_at',
    [username, passwordHash]
  );
  return res.rows[0];
}
