-- 1. Utenti
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Dataset di un utente
CREATE TABLE datasets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, name)
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
    rdf JSONB DEFAULT '{}',
    last_modified_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(dataset_id, name)
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
    annotation_meta JSONB DEFAULT '{}',
    source_column_id INTEGER REFERENCES columns(id),
    UNIQUE (table_id, name)
);

-- 5. Celle della tabella
CREATE TABLE cells (
    id SERIAL PRIMARY KEY,
    column_id INTEGER REFERENCES columns(id) ON DELETE CASCADE,
    row_index INTEGER NOT NULL,
    cell_value TEXT,
    match_id TEXT,
    score REAL,
    candidates JSONB DEFAULT '[]',
    annotation_meta JSONB DEFAULT '{}', 
    UNIQUE (column_id, row_index)
);

-- 6. Indici
CREATE INDEX idx_datasets_user_id ON datasets(user_id);
CREATE INDEX idx_tables_dataset_id ON tables(dataset_id);
CREATE INDEX idx_columns_table_id ON columns(table_id);
CREATE INDEX idx_candidates_jsonb ON cells USING gin(candidates);

-- 7. Triggers
CREATE OR REPLACE FUNCTION update_table_stats()
RETURNS TRIGGER AS $$
DECLARE
  col_table_id INTEGER;
BEGIN
  IF TG_TABLE_NAME = 'columns' THEN
    IF (TG_OP = 'DELETE') THEN
      col_table_id := OLD.table_id;
    ELSE
      col_table_id := COALESCE(NEW.table_id, OLD.table_id);
    END IF;
  ELSIF TG_TABLE_NAME = 'cells' THEN
    IF (TG_OP = 'DELETE') THEN
      SELECT table_id INTO col_table_id FROM columns WHERE id = OLD.column_id;
    ELSE
      SELECT table_id INTO col_table_id FROM columns WHERE id = COALESCE(NEW.column_id, OLD.column_id);
    END IF;
  END IF;

  IF col_table_id IS NULL THEN
    RETURN NULL;
  END IF;

  UPDATE tables t
  SET
    num_col = (SELECT COUNT(*) FROM columns c WHERE c.table_id = col_table_id),
    num_rows = COALESCE((
      SELECT MAX(rr.row_index) + 1
      FROM cells rr
      JOIN columns c ON rr.column_id = c.id
      WHERE c.table_id = col_table_id
    ), 0),
    num_cells = (
      (SELECT COUNT(*) FROM columns c WHERE c.table_id = col_table_id) *
      COALESCE((
        SELECT MAX(rr.row_index) + 1
        FROM cells rr
        JOIN columns c ON rr.column_id = c.id
        WHERE c.table_id = col_table_id
      ), 0)
    ),
    num_cells_reconciliated = (
      SELECT COUNT(*)
      FROM cells rr
      JOIN columns c ON rr.column_id = c.id
      WHERE c.table_id = col_table_id AND c.status = 'reconciliated'
    ),
    rdf = '{}'::jsonb,
    last_modified_date = CURRENT_TIMESTAMP
  WHERE t.id = col_table_id;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_table_stats
AFTER INSERT OR UPDATE OR DELETE ON cells
FOR EACH ROW
EXECUTE FUNCTION update_table_stats();

CREATE TRIGGER trg_update_table_stats_on_columns
AFTER INSERT OR UPDATE OR DELETE ON columns
FOR EACH ROW
EXECUTE FUNCTION update_table_stats();

