const pool = require('./index');

async function getDatasetsByUserId(userId) {
  const res = await pool.query('SELECT * FROM datasets WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
  return res.rows;
}

async function getDatasetById(id) {
  const res = await pool.query('SELECT * FROM datasets WHERE id = $1', [id]);
  return res.rows[0];
}

async function createDataset(userId, name, description) {
  const res = await pool.query(
    'INSERT INTO datasets (user_id, name, description) VALUES ($1, $2, $3) RETURNING *',
    [userId, name, description]
  );
  return res.rows[0];
}

module.exports = {
  getDatasetsByUserId,
  getDatasetById,
  createDataset,
};
