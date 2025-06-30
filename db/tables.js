import pool from './index.js';

export async function getAllTables() {
  const res = await pool.query('SELECT * FROM tables');
  return res.rows;
}

export async function getTablesByDatasetId(datasetId, orderBy = 'name', order = 'ASC') {
  const allowedOrderBy = ['name', 'id', 'created_at', 'num_col', 'num_rows', 'num_cells', 'num_cells_reconciliated', 'last_modified_date'];
  const allowedOrder = ['ASC', 'DESC'];
  const orderBySafe = allowedOrderBy.includes(orderBy) ? orderBy : 'name';
  const orderSafe = allowedOrder.includes(order.toUpperCase()) ? order.toUpperCase() : 'ASC';
  const res = await pool.query(
    `SELECT *
     FROM tables WHERE dataset_id = $1 ORDER BY ${orderBySafe} ${orderSafe}`, 
    [datasetId]
  );
  return res.rows;
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

export async function searchTablesByName(name) {
  const res = await pool.query(
    'SELECT * FROM tables WHERE LOWER(name) LIKE LOWER($1)', 
    [`%${name}%`]
  );
  return res.rows;
}

export async function searchTablesByUserAndName(userId, tableName) {
  const res = await pool.query(
    `SELECT t.*
     FROM tables t
     JOIN datasets d ON d.id = t.dataset_id
     WHERE d.user_id = $1 AND LOWER(t.name) LIKE LOWER($2)`,
    [userId, `%${tableName}%`]
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

export async function updateRDF(id, rdf){
  const res = await pool.query(
    `UPDATE tables SET rdf = $1, last_modified_date = NOW() WHERE id = $2 RETURNING *`,
    [rdf, id]
  );
  return res.rows[0];
}

export async function deleteTable(id) {
  const res = await pool.query(
    `DELETE FROM tables WHERE id = $1 RETURNING *`,
    [id]);
  return res.rows[0];
}

export async function printTableByTableId(tableId) {
  const res = await pool.query(
    `SELECT c.name AS column_name, rr.row_index, rr.match_id, rr.cell_value
     FROM cells rr
     JOIN columns c ON rr.column_id = c.id
     WHERE c.table_id = $1
     ORDER BY rr.row_index, c.id`,
    [tableId]
  );

  const rows = {};
  const columns = new Set();

  for (const { column_name, row_index, cell_value, match_id } of res.rows) {
    columns.add(column_name);
    if (!rows[row_index]) rows[row_index] = {};
    rows[row_index][column_name] = match_id
      ? `${cell_value} ${match_id}`
      : cell_value ?? '';
  }

  const colArray = Array.from(columns);
  console.log(['row_index', ...colArray].join('\t'));
  Object.entries(rows).forEach(([rowIdx, cells]) => {
    const row = [rowIdx, ...colArray.map(col => cells[col] ?? '')];
    console.log(row.join('\t'));
  });
}