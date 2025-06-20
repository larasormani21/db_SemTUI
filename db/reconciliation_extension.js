const pool = require('./index');

async function getExtensionsByReconciliationId(reconciliationId) {
  const res = await pool.query('SELECT * FROM reconciliation_extensions WHERE reconciliation_id = $1', [reconciliationId]);
  return res.rows;
}

async function getExtensionById(id) {
  const res = await pool.query('SELECT * FROM reconciliation_extensions WHERE id = $1', [id]);
  return res.rows[0];
}

async function createExtension(reconciliationId, property, value, valueKind, context = null) {
  const res = await pool.query(
    `INSERT INTO reconciliation_extensions 
      (reconciliation_id, property, value, value_kind, context)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [reconciliationId, property, value, valueKind, context]
  );
  return res.rows[0];
}

module.exports = {
  getExtensionsByReconciliationId,
  getExtensionById,
  createExtension,
};
