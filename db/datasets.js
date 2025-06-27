import pool from './index.js';

export async function getAllDatasets() {
  const res = await pool.query('SELECT * FROM datasets');
  return res.rows;
}

export async function getDatasetById(id) {
  const res = await pool.query('SELECT * FROM datasets WHERE id = $1', [id]);
  return res.rows;
}

export async function getDatasetsByUserId(userId, orderBy = 'name', order = 'ASC') {
  const allowedOrderBy = ['name', 'id', 'created_at'];
  const allowedOrder = ['ASC', 'DESC'];
  const orderBySafe = allowedOrderBy.includes(orderBy) ? orderBy : 'name';
  const orderSafe = allowedOrder.includes(order.toUpperCase()) ? order.toUpperCase() : 'ASC';

  const res = await pool.query(
    `SELECT * FROM datasets WHERE user_id = $1 ORDER BY ${orderBySafe} ${orderSafe}`,
    [userId]
  );
  return res.rows;
}

export async function getIdbyUserAndName(userId, datasetName) {
  const res = await pool.query(
    'SELECT id FROM datasets WHERE user_id = $1 AND LOWER(name) = LOWER($2)',
    [userId, datasetName]
  );
  return res.rows[0]?.id;
}

export async function getDatasetByName(name) {
  const res = await pool.query('SELECT * FROM datasets WHERE LOWER(name) LIKE LOWER($1)', [`%${name}%`]);
  return res.rows;
}

export async function getDatasetByNameAndUser(userId, name) {
  const res = await pool.query(
    'SELECT * FROM datasets WHERE user_id = $1 AND LOWER(name) LIKE LOWER($2)',
    [userId, `%${name}%`]
  );
  return res.rows;
}

export async function createDataset(userId, name, description) {
  const res = await pool.query(
    'INSERT INTO datasets (user_id, name, description) VALUES ($1, $2, $3) RETURNING *',
    [userId, name, description]
  );
  return res.rows[0];
}

export async function updateDataset(id, name, description) {
  const res = await pool.query(
    'UPDATE datasets SET name = $1, description = $2 WHERE id = $3 RETURNING *',
    [name, description, id]
  );
  return res.rows[0];
}

export async function deleteDataset(id) {
  const res = await pool.query('DELETE FROM datasets WHERE id = $1 RETURNING *', [id]);
  return res.rows[0];
}