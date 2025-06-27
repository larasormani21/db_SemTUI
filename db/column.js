import pool from './index.js';

export async function getIdByTableAndName(tableId, columnName) {
  const res = await pool.query(
    'SELECT id FROM columns WHERE table_id = $1 AND LOWER(name) = LOWER($2)',
    [tableId, columnName]
  );
  return res.rows[0]?.id;
}

export async function getAllColumns() {
  const res = await pool.query('SELECT * FROM columns ORDER BY id');
  return res.rows;
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

export async function updateReconciliationColumn(id, status = "reconciliated", context = {}, isEntity = false, metadata = [], annotationMeta = {}) {
  const res = await pool.query(
    `UPDATE columns 
     SET status = $1, context = $2, is_entity = $3, metadata = $4, annotation_meta = $5
     WHERE id = $6 RETURNING *`,
    [status, JSON.stringify(context), isEntity, JSON.stringify(metadata), JSON.stringify(annotationMeta),id]
  );
  return res.rows[0];
}

export async function deleteColumn(columnId) {
  const colRes = await pool.query(
    'SELECT name, table_id FROM columns WHERE id = $1',
    [columnId]
  );
  if (!colRes.rows.length) return null;
  const { name: columnName, table_id: tableId } = colRes.rows[0];

  await pool.query(
    `
    UPDATE columns
    SET metadata = jsonb_set(
      metadata,
      '{0,property}',
      COALESCE((
        SELECT jsonb_agg(prop)
        FROM jsonb_array_elements(metadata->0->'property') AS prop
        WHERE prop->>'obj' <> $1
      ), '[]'::jsonb)
    )
    WHERE table_id = $2
      AND id <> $3
      AND metadata->0->'property' IS NOT NULL
    `,
    [columnName, tableId, columnId]
  );

  const deleted = await pool.query(
    'DELETE FROM columns WHERE id = $1 RETURNING *',
    [columnId]
  );
  return deleted.rows[0];
}

export async function addPropertyToColumn(columnId, propertyObj) {
  const res = await pool.query(
    `
    UPDATE columns
    SET metadata = jsonb_set(
      metadata,
      '{0,property}',
      (COALESCE(metadata->0->'property', '[]'::jsonb) || $1::jsonb)
    )
    WHERE id = $2
    RETURNING *;
    `,
    [JSON.stringify(propertyObj), columnId]
  );
  return res.rows[0];
}

export async function deletePropertyFromColumn(columnId, propertyId) {
  const res = await pool.query(
    `
    UPDATE columns
    SET metadata = jsonb_set(
      metadata,
      '{0,property}',
      COALESCE((
        SELECT jsonb_agg(prop)
        FROM jsonb_array_elements(metadata->0->'property') AS prop
        WHERE prop->>'id' <> $1
      ), '[]'::jsonb)
    )
    WHERE id = $2
    RETURNING *;
    `,
    [propertyId, columnId]
  );
  return res.rows[0];
}

export async function getPropertiesFromColumn(id) {
  const res = await pool.query(
    `
    SELECT metadata->0->'property' AS properties
    FROM columns
    WHERE id = $1
    `,
    [id]
  );
  return res.rows[0]?.properties || [];
}

export async function getAllPropertiesOfTable(tableId) {
  const res = await pool.query(
    `
    SELECT
      c1.id AS id_col1,
      c1.name AS name_col1,
      prop->>'id' AS id_property,
      c2.id AS id_col2,
      c2.name AS name_col2
    FROM columns c1
    JOIN LATERAL jsonb_array_elements(c1.metadata->0->'property') AS prop ON TRUE
    JOIN columns c2 ON prop->>'obj' = c2.name
    WHERE c1.metadata->0->'property' IS NOT NULL AND c1.table_id = $1
    `, [tableId]
  );
  return res.rows;
}

export async function getMetadataByColumnId(columnId) {
  const res = await pool.query(
    `
    SELECT metadata
    FROM columns
    WHERE id = $1
    `,
    [columnId]
  );
  if (!res.rows.length) return null;
  // Restituisce l'oggetto metadata già come oggetto JS
  return res.rows[0].metadata;
}