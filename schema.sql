-- 1. Utenti
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Dataset
CREATE TABLE datasets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabelle contenute in un dataset
CREATE TABLE tables (
    id SERIAL PRIMARY KEY,
    dataset_id INTEGER REFERENCES datasets(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    num_col INTEGER NOT NULL,
    num_rows INTEGER NOT NULL,
    num_cells INTEGER NOT NULL,
    num_cells_reconciliated INTEGER NOT NULL,
    last_modified_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Colonne per ciascuna tabella
CREATE TABLE columns (
    id SERIAL PRIMARY KEY,
    table_id INTEGER REFERENCES tables(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    status TEXT,
    context JSONB DEFAULT '{}',
    is_entity BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '[]',
    annotation_meta JSONB DEFAULT '{}'
);

-- 5. Risultati di riconciliazione (una riga per cella)
CREATE TABLE reconciliation_results (
    id SERIAL PRIMARY KEY,
    column_id INTEGER REFERENCES columns(id) ON DELETE CASCADE,
    row_index INTEGER NOT NULL,
    cell_value TEXT,
    best_match_uri TEXT,
    best_match_label TEXT,
    score REAL,
    candidates JSONB DEFAULT '[]',
    annotation_meta JSONB DEFAULT '{}'
);

-- 6. Estensioni per risultati di riconciliazione (serie temporali, proprietà multiple, etc.)
CREATE TABLE reconciliation_extensions (
    id INTEGER PRIMARY KEY,
    reconciliation_id INTEGER REFERENCES reconciliation_results(id) ON DELETE CASCADE,
    property TEXT NOT NULL,
    value TEXT,
    value_kind TEXT DEFAULT 'literal',
    context TEXT
);

-- 7. Indici
CREATE INDEX idx_reconciliation_column_row ON reconciliation_results(column_id, row_index);
CREATE INDEX idx_candidates_jsonb ON reconciliation_results USING gin(candidates);
CREATE INDEX idx_recon_ext_recon_id_property ON reconciliation_extensions(reconciliation_id, property);


-- 8. Triggers
CREATE OR REPLACE FUNCTION update_table_stats()
RETURNS TRIGGER AS $$
DECLARE
  col_table_id INTEGER;
BEGIN
  IF (TG_OP = 'DELETE') THEN
    SELECT table_id INTO col_table_id FROM columns WHERE id = OLD.id;
  ELSE
    col_table_id := COALESCE(NEW.table_id, OLD.table_id);
  END IF;

  IF col_table_id IS NULL THEN
    RETURN NULL;
  END IF;

  UPDATE tables t
  SET
    num_col = (SELECT COUNT(*) FROM columns c WHERE c.table_id = col_table_id),
    num_rows = COALESCE((
      SELECT MAX(rr.row_index) + 1
      FROM reconciliation_results rr
      JOIN columns c ON rr.column_id = c.id
      WHERE c.table_id = col_table_id
    ), 0),
    num_cells = (
      (SELECT COUNT(*) FROM columns c WHERE c.table_id = col_table_id) *
      COALESCE((
        SELECT MAX(rr.row_index) + 1
        FROM reconciliation_results rr
        JOIN columns c ON rr.column_id = c.id
        WHERE c.table_id = col_table_id
      ), 0)
    ),
    num_cells_reconciliated = (
      SELECT COUNT(*)
      FROM reconciliation_results rr
      JOIN columns c ON rr.column_id = c.id
      WHERE c.table_id = col_table_id AND c.status = 'reconciliated'
    ),
    last_modified_date = CURRENT_TIMESTAMP
  WHERE t.id = col_table_id;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_table_stats
AFTER INSERT OR UPDATE OR DELETE ON reconciliation_results
FOR EACH STATEMENT
EXECUTE FUNCTION update_table_stats();

CREATE TRIGGER trg_update_table_stats_on_columns
AFTER INSERT OR UPDATE OF status OR DELETE ON columns
FOR EACH STATEMENT
EXECUTE FUNCTION update_table_stats();

CREATE TRIGGER trg_update_table_stats_on_columns
AFTER INSERT OR UPDATE OR DELETE ON columns
FOR EACH ROW
EXECUTE FUNCTION update_table_stats();

