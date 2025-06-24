import pool from './index.js';

export async function getResultsByColumnId(columnId) {
  const res = await pool.query('SELECT * FROM reconciliation_results WHERE column_id = $1 ORDER BY row_index', [columnId]);
  return res.rows;
}

export async function getIdByColumnIdAndRow(columnId, rowIndex) {
  const res = await pool.query(
    'SELECT id FROM reconciliation_results WHERE column_id = $1 AND row_index = $2',
    [columnId, rowIndex]
  );
  return res.rows[0]?.id;
}

export async function getResultById(id) {
  const res = await pool.query('SELECT * FROM reconciliation_results WHERE id = $1', [id]);
  return res.rows[0];
}

export async function createResult(columnId, rowIndex, cellValue, bestMatchUri = null, bestMatchLabel = null, score = null, candidates = [], annotationMeta = {}) {
  const res = await pool.query(
    `INSERT INTO reconciliation_results 
      (column_id, row_index, cell_value, best_match_uri, best_match_label, score, candidates, annotation_meta)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [columnId, rowIndex, cellValue, bestMatchUri, bestMatchLabel, score, JSON.stringify(candidates), JSON.stringify(annotationMeta)]
  );
  return res.rows[0];
}

export async function updateCellLabel(id, cellValue) {
  const res = await pool.query(
    `UPDATE reconciliation_results SET cell_value = $1 WHERE id = $2 RETURNING *`,
    [cellValue, id]
  );
  return res.rows[0];
}

export async function updateReconciliationResultById(id, bestMatchUri, bestMatchLabel, score, candidates = [], annotationMeta = {}) {
  const res = await pool.query(
    `UPDATE reconciliation_results SET best_match_uri = $1, best_match_label = $2, score = $3, candidates = $4, annotation_meta = $5 WHERE id = $6 RETURNING *`,
    [bestMatchUri, bestMatchLabel, score, JSON.stringify(candidates), JSON.stringify(annotationMeta), id]
  );
  return res.rows[0];
}

export async function updateReconciliationResultByColumnIdAndRow(columnId, rowIndex, bestMatchUri, bestMatchLabel, score, candidates = [], annotationMeta = {}) {
  const res = await pool.query(
    `UPDATE reconciliation_results 
     SET best_match_uri = $1, best_match_label = $2, score = $3, candidates = $4, annotation_meta = $5 
     WHERE column_id = $6 AND row_index = $7 RETURNING *`,
    [bestMatchUri, bestMatchLabel, score, JSON.stringify(candidates), JSON.stringify(annotationMeta), columnId, rowIndex]
  );
  return res.rows[0];
}
