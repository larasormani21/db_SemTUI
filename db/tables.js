const pool = require('./index');

async function getTablesByDatasetId(datasetId) {
  const res = await pool.query('SELECT * FROM tables WHERE dataset_id = $1 ORDER BY created_at DESC', [datasetId]);
  return res.rows;
}

async function getTableById(id) {
  const res = await pool.query('SELECT * FROM tables WHERE id = $1', [id]);
  return res.rows[0];
}

async function createTable(datasetId, name) {
  const res = await pool.query(
    `INSERT INTO tables (dataset_id, name) VALUES ($1, $2) RETURNING *`,
    [datasetId, name]
  );
  return res.rows[0];
}

module.exports = {
  getTablesByDatasetId,
  getTableById,
  createTable,
};
