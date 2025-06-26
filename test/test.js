import fs from 'fs/promises';
import path from 'path';
import bcrypt from 'bcrypt';
import * as db from '../db/index.js';


const dataDir = path.resolve('./test/data');
const SALT_ROUNDS = 10;

async function processUsers() {
  const filePath = path.join(dataDir, 'users.info.json');
  const content = await fs.readFile(filePath, 'utf-8');
  const json = JSON.parse(content);
  const users = json.users;
  for (const user of Object.values(users)) {
    const { username, password } = user;
    if (!username || !password) continue;
    const existing = await db.getUserByUsername(username);
    if (existing) continue;
    await db.createUser(username, password);
  }
}

async function processDatasets() {
  const filePath = path.join(dataDir, 'datasets.info.json');
  const content = await fs.readFile(filePath, 'utf-8');
  const json = JSON.parse(content);
  const datasets = json.datasets;
  for (const ds of Object.values(datasets)) {
    await db.createDataset(ds.userId, ds.name, ds.description);
  }
}

async function processTables() {
  const filePath = path.join(dataDir, 'tables.info.json');
  const content = await fs.readFile(filePath, 'utf-8');
  const json = JSON.parse(content);
  const tables = json.tables;
  for (const t of Object.values(tables)) {
    await db.createTable(
      t.idDataset,
      t.name,
      t.nCols || 0,
      t.nRows || 0,
      t.nCells || 0,
      t.nCellsReconciliated || 0
    );
  }
}

function normalizeColName(name) {
  return name.replace(/^\uFEFF/, '').trim();
}

async function processColumnsAndResults(tableId) {
  const filePath = path.join(dataDir, '126_big.json');
  const content = await fs.readFile(filePath, 'utf-8');
  const json = JSON.parse(content);

  // Columns
  if (json.columns) {
    const columns = {};
    let colIndex = 0;
    // Creazione colonne
    for (const [colName, col] of Object.entries(json.columns)) {
      const normColName = normalizeColName(colName);
      const dbCol = await db.createColumn(
        tableId,
        normColName,
        col.status || null,
        col.context || {},
        col.kind === 'entity',
        col.metadata || [],
        col.annotationMeta || {}
      );
      columns[normColName] = dbCol.id;
      colIndex++;
    }
    // Reconciliation Results
    if (json.rows) {
  for (const [rowKey, row] of Object.entries(json.rows)) {
    if (!row.cells) continue;
    const rowIndex = parseInt(rowKey.replace('r', ''));
    // Parsing celle
    for (const [colName, cell] of Object.entries(row.cells)) {
      const normColName = normalizeColName(colName);
      const columnId = columns[normColName];
      if (!columnId) continue;
      await db.createResult(
        columnId,
        rowIndex,
        cell.label,
        cell.metadata && cell.metadata[0] && cell.metadata[0].name && cell.metadata[0].name.uri ? cell.metadata[0].name.uri : null,
        cell.metadata && cell.metadata[0] && cell.metadata[0].name && cell.metadata[0].name.value ? cell.metadata[0].name.value : null,
        cell.metadata && cell.metadata[0] && cell.metadata[0].score ? cell.metadata[0].score : null,
        cell.metadata ? cell.metadata : [],
        cell.annotationMeta ? cell.annotationMeta : {}
      );
    }
  }
}
  }
}

async function processExtensionJson(tableId, extensionFilePath) {
  const extContent = await fs.readFile(extensionFilePath, 'utf-8');
  const extJson = JSON.parse(extContent);

  // 1. Popola columns
  const columnIds = {};
  const columnMetas = {};
  for (const meta of extJson.meta) {
    let isEntity = !!meta.type;
    let metadata = [meta]; // inserisci l'intero oggetto meta in un array
    const col = await db.createColumn(
      tableId,
      meta.id,
      null, // status
      {},   // context
      isEntity,
      metadata,
      {}    // annotationMeta: sempre vuoto
    );
    columnIds[meta.id] = col.id;
    columnMetas[meta.id] = meta;
  }

  // 2. Popola cells
  let rowIndex = 0;
  for (const [qid, props] of Object.entries(extJson.rows)) {
    for (const [property, values] of Object.entries(props)) {
      const columnId = columnIds[property];
      const meta = columnMetas[property];
      const isEntity = !!(meta && meta.type);
      if (!columnId || !Array.isArray(values) || values.length === 0) continue;

      const first = values[0];
      let cellValue = first.name || first.str || first.id || '';
      let bestMatchUri = null;
      let bestMatchLabel = null;

      if (isEntity) {
        bestMatchUri = first.id || null;
        bestMatchLabel = first.name || null;
      }

      await db.createResult(
        columnId,
        rowIndex,
        cellValue,
        bestMatchUri,
        bestMatchLabel,
        null,           
        values,         
        {}
      );
    }
    rowIndex++;
  }
}

async function testQueries() {
  console.time('Tempo di esecuzione');
  //const results = await db.deleteTable(5);
  const results = await db.searchCandidatesByLabelSubstring('A', 52)
  console.timeEnd('Tempo di esecuzione');
  console.dir(results, { depth: null, colors: true });
}

async function run() {
  //await processUsers();
  //await processDatasets();
  //await processTables();
  //await testQueries();
  //await processColumnsAndResults(8);
  //await processExtensionJson(1, path.join(dataDir, '1.extension.response.json'));
  await testQueries();
  // await printTableByTableId(1);  
}

run().catch(console.error);

