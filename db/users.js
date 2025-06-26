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
  const res = await pool.query('SELECT * FROM users');
  return res.rows;
}

export async function getUserById(id) {
  const res = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
  return res.rows[0];
}

export async function getUserByUsername(username) {
  const res = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
  return res.rows[0];
}

export async function createUser(username, password) {
  password = await bcrypt.hash(password, 10);
  const res = await pool.query(
    'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id, username, created_at',
    [username, password]
  );
  return res.rows[0];
}

export async function updateUser(id, newUsername, newPassword) {
  const res = await pool.query(
    'UPDATE users SET username = $1, password = $2 WHERE id = $3 RETURNING id, username, created_at',
    [newUsername, newPassword, id]
  );
  return res.rows[0];
}

export async function deleteUser(id) {
  const res = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
  return res.rows[0];
}

