import pool from './index.js';

export async function createExtensionColumn(table_id, name, status = 'pending', context = {}, is_entity = false, metadata = [], annotation_meta = {}) {
  const res = await pool.query(
    `INSERT INTO extension_columns (table_id, name, status, context, is_entity, metadata, annotation_meta)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [table_id, name, status, context, is_entity, metadata, annotation_meta]
  );
  return res.rows[0];
}

export async function createExtensionResult(column_id, row_index, selected = false, annotation_meta = {}) {
  const res = await pool.query(
    `INSERT INTO extension_results (column_id, row_index, selected, annotation_meta)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [column_id, row_index, selected, annotation_meta]
  );
  return res.rows[0];
}