import pool from './index.js';

export async function getAllResults() {
  const res = await pool.query('SELECT * FROM cells ORDER BY column_id, row_index');
  return res.rows;
}

export async function getResultsByColumnId(columnId) {
  const res = await pool.query('SELECT * FROM cells WHERE column_id = $1 ORDER BY row_index', [columnId]);
  return res.rows;
}

export async function getIdByColumnIdAndRow(columnId, rowIndex) {
  const res = await pool.query(
    'SELECT id FROM cells WHERE column_id = $1 AND row_index = $2',
    [columnId, rowIndex]
  );
  return res.rows[0]?.id;
}

export async function getResultById(id) {
  const res = await pool.query('SELECT * FROM cells WHERE id = $1', [id]);
  return res.rows[0];
}

export async function createResult(columnId, rowIndex, cellValue, bestMatchUri = null, bestMatchLabel = null, score = null, candidates = [], annotationMeta = {}) {
  const res = await pool.query(
    `INSERT INTO cells 
      (column_id, row_index, cell_value, best_match_uri, best_match_label, score, candidates, annotation_meta)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [columnId, rowIndex, cellValue, bestMatchUri, bestMatchLabel, score, JSON.stringify(candidates), JSON.stringify(annotationMeta)]
  );
  return res.rows[0];
}

export async function updateCellLabel(id, cellValue) {
  const res = await pool.query(
    `UPDATE cells SET cell_value = $1 WHERE id = $2 RETURNING *`,
    [cellValue, id]
  );
  return res.rows[0];
}

export async function updateReconciliationResultById(id, bestMatchUri, bestMatchLabel, score, candidates = [], annotationMeta = {}) {
  const res = await pool.query(
    `UPDATE cells SET best_match_uri = $1, best_match_label = $2, score = $3, candidates = $4, annotation_meta = $5 WHERE id = $6 RETURNING *`,
    [bestMatchUri, bestMatchLabel, score, JSON.stringify(candidates), JSON.stringify(annotationMeta), id]
  );
  return res.rows[0];
}

export async function updateReconciliationResultByColumnIdAndRow(columnId, rowIndex, bestMatchUri, bestMatchLabel, score, candidates = [], annotationMeta = {}) {
  const res = await pool.query(
    `UPDATE cells 
     SET best_match_uri = $1, best_match_label = $2, score = $3, candidates = $4, annotation_meta = $5 
     WHERE column_id = $6 AND row_index = $7 RETURNING *`,
    [bestMatchUri, bestMatchLabel, score, JSON.stringify(candidates), JSON.stringify(annotationMeta), columnId, rowIndex]
  );
  return res.rows[0];
}

export async function updateBestMatchById(id, bestMatchUri, bestMatchLabel, score) {
  const res = await pool.query()(
    `UPDATE cells 
     SET best_match_uri = $1, best_match_label = $2, score = $3
     WHERE id = $4 RETURNING *`,
    [bestMatchUri, bestMatchLabel, score, id]
  );
  return res.rows[0];
}

export async function getResultsWithMinScore(score) {
  const res = await pool.query(
    `SELECT * FROM cells
     WHERE score >= $1`,
    [score]
  );
  return res.rows;
}

export async function getResultsWithMinScoreByColumnId(columnId, score) {
  const res = await pool.query(
    `SELECT * FROM cells 
     WHERE column_id = $1 AND score >= $2`,
    [columnId, score]
  );
  return res.rows;
}

export async function getCandidatesByCellId(cellId) {
  const res = await pool.query(
    `SELECT rr.id AS cell_id,
            rr.column_id,
            rr.row_index,
            rr.cell_value,
            cand -> 'name' ->> 'uri'   AS candidate_uri,
            cand -> 'name' ->> 'value' AS candidate_label,
            (cand ->> 'score')::FLOAT AS candidate_score
    FROM cells rr,
         jsonb_array_elements(rr.candidates) AS cand
    WHERE jsonb_typeof(rr.candidates) = 'array' AND rr.id = $1`,
    [cellId]
  );
  return res.rows;
}

export async function getCandidatesWithMinScore(score) {
  const res = await pool.query(
    `SELECT
      rr.id AS cell_id,
      rr.column_id,
      rr.row_index,
      rr.cell_value,
      cand -> 'name' ->> 'uri'   AS candidate_uri,
      cand -> 'name' ->> 'value' AS candidate_label,
      (cand ->> 'score')::FLOAT AS candidate_score
    FROM cells rr,
         jsonb_array_elements(rr.candidates) AS cand
    WHERE jsonb_typeof(rr.candidates) = 'array' AND 
    (cand ->> 'score')::FLOAT >= $1`,
    [score]
  );
  return res.rows;
}

export async function getCandidatesWithMinScoreByColumnId(columnId, score) {
  const res = await pool.query(
    `SELECT
      rr.id AS cell_id,
      rr.row_index,
      rr.cell_value,
      cand -> 'name' ->> 'uri'   AS candidate_uri,
      cand -> 'name' ->> 'value' AS candidate_label,
      (cand ->> 'score')::FLOAT AS candidate_score
    FROM cells rr,
         jsonb_array_elements(rr.candidates) AS cand
    WHERE jsonb_typeof(rr.candidates) = 'array' AND 
    (cand ->> 'score')::FLOAT >= $1 AND rr.column_id = $2`,
    [score, columnId]
  );
  return res.rows;
}

export async function searchCellsByValuePrefix(prefix, columnId = null) {
  const params = [`${prefix}%`];
  let where = `rr.cell_value ILIKE $1`;
  if (columnId !== null) {
    where += ' AND rr.column_id = $2';
    params.push(columnId);
  }
  const res = await pool.query(
    `SELECT
      rr.id AS cell_id,
      rr.row_index,
      rr.cell_value,
      rr.column_id
    FROM cells rr
    WHERE ${where}`,
    params
  );
  return res.rows;
}

export async function searchCandidatesByLabelSubstring(substring, columnId = null) {
  const params = [`%${substring}%`];
  let where = `jsonb_typeof(rr.candidates) = 'array' AND cand -> 'name' ->> 'value' ILIKE $1`;
  if (columnId !== null) {
    where += ' AND rr.column_id = $2';
    params.push(columnId);
  }
  const res = await pool.query(
    `SELECT
      rr.id AS cell_id,
      rr.column_id,
      rr.row_index,
      rr.cell_value,
      cand -> 'name' ->> 'uri'   AS candidate_uri,
      cand -> 'name' ->> 'value' AS candidate_label,
      (cand ->> 'score')::FLOAT AS candidate_score
    FROM cells rr,
         jsonb_array_elements(rr.candidates) AS cand
    WHERE ${where}`,
    params
  );
  return res.rows;
}