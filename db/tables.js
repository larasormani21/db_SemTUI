import pool from './index.js';

export async function getTablesByDatasetId(datasetId) {
  const res = await pool.query(
    `SELECT id, dataset_id, name, n_cols, n_rows, n_cells, n_cells_reconciliated, last_modified_date
     FROM tables WHERE dataset_id = $1 ORDER BY created_at DESC`, 
    [datasetId]
  );
  return res.rows.map(row => ({
    ...row,
    completion: {
      total: row.n_cells,
      value: row.n_cells_reconciliated
    }
  }));
}

export async function getTableById(id) {
  const res = await pool.query('SELECT * FROM tables WHERE id = $1', [id]);
  return res.rows[0];
}

export async function getTablesByName(name) {
  const res = await pool.query(
    'SELECT * FROM tables WHERE LOWER(name) LIKE LOWER($1)', 
    [`%${name}%`]
  );
  return res.rows;
}

export async function getTablesByNameAndUser(userId, name) {
  const res = await pool.query(
    `SELECT t.*
     FROM tables t
     JOIN datasets d ON d.id = t.dataset_id
     WHERE d.user_id = $1 AND LOWER(t.name) LIKE LOWER($2)`,
    [userId, `%${name}%`]
  );
  return res.rows;
}

export async function getTablesByNameAndId(userId, id) {
  const res = await pool.query(
    `SELECT t.*
     FROM tables t
     JOIN datasets d ON d.id = t.dataset_id
     WHERE d.user_id = $1 AND t.id = $2`,
    [userId, id]
  );
  return res.rows;
}

export async function createTable(datasetId, name, nCols = 0, nRows = 0, nCells = 0, nCellsReconciliated = 0) {
  const res = await pool.query(
    `INSERT INTO tables 
      (dataset_id, name, num_col, num_rows, num_cells, num_cells_reconciliated, last_modified_date)
     VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING *`,
    [datasetId, name, nCols, nRows, nCells, nCellsReconciliated]
  );
  return res.rows[0];
}
