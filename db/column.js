import pool from './index.js';

export async function getIdByTableAndName(tableId, name) {
  const res = await pool.query(
    'SELECT id FROM columns WHERE table_id = $1 AND LOWER(name) = LOWER($2)',
    [tableId, name]
  );
  return res.rows[0]?.id;
}

export async function getColumnsByTableId(tableId) {
  const res = await pool.query('SELECT * FROM columns WHERE table_id = $1 ORDER BY id', [tableId]);
  return res.rows;
}

export async function getColumnById(id) {
  const res = await pool.query('SELECT * FROM columns WHERE id = $1', [id]);
  return res.rows[0];
}

export async function getColumnByName(tableId, name) {
  const res = await pool.query(
    'SELECT * FROM columns WHERE table_id = $1 AND LOWER(name) = LOWER($2)',
    [tableId, name]
  );
  return res.rows[0];
}

export async function createColumn(tableId, name, status = null, context = {}, isEntity = false, metadata = [], annotationMeta = {}) {
  const res = await pool.query(
    `INSERT INTO columns 
      (table_id, name, status, context, is_entity, metadata, annotation_meta)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [tableId, name, status, JSON.stringify(context), isEntity, JSON.stringify(metadata), JSON.stringify(annotationMeta)]
  );
  return res.rows[0];
}

export async function updateColumnName(id, name) {
  const res = await pool.query(
    'UPDATE columns SET name = $1 WHERE id = $2 RETURNING *',
    [name, id]
  );
  return res.rows[0];
}

export async function updateReconciliationColumn(id, status = "reconciliated", context, isEntity, metadata, annotationMeta) {
  const res = await pool.query(
    `UPDATE columns 
     SET status = $1, context = $2, is_entity = $3, metadata = $4, annotation_meta = $5 
     WHERE id = $6 RETURNING *`,
    [status, JSON.stringify(context), isEntity, JSON.stringify(metadata), JSON.stringify(annotationMeta), id]
  );
  return res.rows[0];
}

export async function deleteColumn(id) {
  const res = await pool.query(
    'DELETE FROM columns WHERE id = $1 RETURNING *',
    [id]
  );
  return res.rows[0];
}

export async function deleteColumnsByNameAndTableId(tableId, name) {
  const res = await pool.query(
    'DELETE FROM columns WHERE table_id = $1 AND LOWER(name) = LOWER($2) RETURNING *',
    [tableId, name]
  );
  return res.rows;
}
