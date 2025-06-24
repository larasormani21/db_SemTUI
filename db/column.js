import pool from './index.js';

export async function getColumnsByTableId(tableId) {
  const res = await pool.query('SELECT * FROM columns WHERE table_id = $1 ORDER BY id', [tableId]);
  return res.rows;
}

export async function getColumnById(id) {
  const res = await pool.query('SELECT * FROM columns WHERE id = $1', [id]);
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
