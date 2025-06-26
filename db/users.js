import pool from './index.js';
import bcrypt from 'bcrypt';

export async function loginUser(username, password) {
  const res = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
  const user = res.rows[0];
  if (!user) return null;
  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) return null;
  return { id: user.id, username: user.username, created_at: user.created_at };
}

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

export async function createUser(username, password) {
  const res = await pool.query(
    'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id, username, created_at',
    [username, password]
  );
  return res.rows[0];
}

export async function updateUserPassword(id, newPassword) {
  const res = await pool.query(
    'UPDATE users SET password = $1 WHERE id = $2 RETURNING id, username, created_at',
    [newPassword, id] 
  );
  return res.rows[0];
}

