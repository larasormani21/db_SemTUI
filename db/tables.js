import pool from './index.js';

export async function getTablesByDatasetId(datasetId) {
  const res = await pool.query(
    `SELECT *
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

export async function getIdByDatasetAndName(datasetId, name) {
  const res = await pool.query(
    'SELECT id FROM tables WHERE dataset_id = $1 AND LOWER(name) = LOWER($2)',
    [datasetId, name]
  );
  return res.rows[0]?.id;
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

export async function updateTableName(id, newName) {
  const res = await pool.query(
    `UPDATE tables SET name = $1, last_modified_date = NOW() WHERE id = $2 RETURNING *`,
    [newName, id]
  );
  return res.rows[0];
}

export async function printTableByTableId(tableId) {
  const res = await pool.query(
    `SELECT c.name AS column_name, rr.row_index, rr.cell_value
     FROM reconciliation_results rr
     JOIN columns c ON rr.column_id = c.id
     WHERE c.table_id = $1
     ORDER BY rr.row_index, c.id`,
    [tableId]
  );

  // Organizza i dati in formato tabellare
  const rows = {};
  const columns = new Set();

  for (const { column_name, row_index, cell_value } of res.rows) {
    columns.add(column_name);
    if (!rows[row_index]) rows[row_index] = {};
    rows[row_index][column_name] = cell_value;
  }

  const colArray = Array.from(columns);
  // Stampa header
  console.log(['row_index', ...colArray].join('\t'));
  // Stampa righe
  Object.entries(rows).forEach(([rowIdx, cells]) => {
    const row = [rowIdx, ...colArray.map(col => cells[col] ?? '')];
    console.log(row.join('\t'));
  });
}