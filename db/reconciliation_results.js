const pool = require('./index');

async function getResultsByColumnId(columnId) {
  const res = await pool.query('SELECT * FROM reconciliation_results WHERE column_id = $1 ORDER BY row_index', [columnId]);
  return res.rows;
}

async function getResultById(id) {
  const res = await pool.query('SELECT * FROM reconciliation_results WHERE id = $1', [id]);
  return res.rows[0];
}

async function createResult(columnId, rowIndex, cellValue, bestMatchUri = null, bestMatchLabel = null, score = null, candidates = [], annotationMeta = {}) {
  const res = await pool.query(
    `INSERT INTO reconciliation_results 
      (column_id, row_index, cell_value, best_match_uri, best_match_label, score, candidates, annotation_meta)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [columnId, rowIndex, cellValue, bestMatchUri, bestMatchLabel, score, candidates, annotationMeta]
  );
  return res.rows[0];
}

module.exports = {
  getResultsByColumnId,
  getResultById,
  createResult,
};
