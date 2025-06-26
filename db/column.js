import pool from './index.js';

export async function getIdByTableAndName(tableId, name) {
  const res = await pool.query(
    'SELECT id FROM columns WHERE table_id = $1 AND LOWER(name) = LOWER($2)',
    [tableId, name]
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

export async function createColumn(tableId, name, status = null, context = {}, isEntity = false, metadata = []) {
  const res = await pool.query(
    `INSERT INTO columns 
      (table_id, name, status, context, is_entity, metadata)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [tableId, name, status, JSON.stringify(context), isEntity, JSON.stringify(metadata)]
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

export async function updateReconciliationColumn(id, status = "reconciliated", context, isEntity, metadata) {
  const res = await pool.query(
    `UPDATE columns 
     SET status = $1, context = $2, is_entity = $3, metadata = $4
     WHERE id = $5 RETURNING *`,
    [status, JSON.stringify(context), isEntity, JSON.stringify(metadata), id]
  );
  return res.rows[0];
}

export async function deleteColumn(columnId, columnName, tableId) {
  // 1. Elimina la colonna
  const deleted = await pool.query(
    'DELETE FROM columns WHERE id = $1 RETURNING *',
    [columnId]
  );
  if (!deleted.rows.length) return null;

  // 2. Rimuovi la property associata (obj = columnName) da tutte le altre colonne della stessa tabella
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

  return deleted.rows[0];
}

export async function deleteColumnsByNameAndTableId(tableId, name) {
  const res = await pool.query(
    'DELETE FROM columns WHERE table_id = $1 AND LOWER(name) = LOWER($2) RETURNING *',
    [tableId, name]
  );
  return res.rows;
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

// Modifica una property nell'array property del primo oggetto metadata
export async function updatePropertyInColumn(columnId, propertyId, newFields) {
  const res = await pool.query(
    `
    UPDATE columns
    SET metadata = jsonb_set(
      metadata,
      '{0,property}',
      COALESCE((
        SELECT jsonb_agg(
          CASE
            WHEN prop->>'id' = $1
            THEN prop || $2::jsonb
            ELSE prop
          END
        )
        FROM jsonb_array_elements(metadata->0->'property') AS prop
      ), '[]'::jsonb)
    )
    WHERE id = $3
    RETURNING *;
    `,
    [propertyId, JSON.stringify(newFields), columnId]
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

export async function getPropertiesFromColumn(tableId, columnName) {
  const res = await pool.query(
    `
    SELECT metadata->0->'property' AS properties
    FROM columns
    WHERE table_id = $1 AND LOWER(name) = LOWER($2)
    `,
    [tableId, columnName]
  );
  return res.rows[0]?.properties || [];
}
