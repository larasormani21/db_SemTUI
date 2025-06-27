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
    console.time('Tempo creazione utente');
    await db.createUser(username, password);
    console.timeEnd('Tempo creazione utente');
  }
}

async function processDatasets() {
  const filePath = path.join(dataDir, 'datasets.info.json');
  const content = await fs.readFile(filePath, 'utf-8');
  const json = JSON.parse(content);
  const datasets = json.datasets;
  for (const ds of Object.values(datasets)) {
    console.time('Tempo creazione dataset');
    await db.createDataset(ds.userId, ds.name, ds.description);
    console.timeEnd('Tempo creazione dataset');
  }
}

async function processTables() {
  const filePath = path.join(dataDir, 'tables.info.json');
  const content = await fs.readFile(filePath, 'utf-8');
  const json = JSON.parse(content);
  const tables = json.tables;
  for (const t of Object.values(tables)) {
    console.time('Tempo creazione tabella');
    await db.createTable(
      t.idDataset,
      t.name,
      t.nCols || 0,
      t.nRows || 0,
      t.nCells || 0,
      t.nCellsReconciliated || 0
    );
    console.timeEnd('Tempo creazione tabella');
  }
}

function normalizeColName(name) {
  return name.replace(/^\uFEFF/, '').trim();
}

async function processColumnsAndResults(tableId, file) {
  const filePath = path.join(dataDir, file);
  const content = await fs.readFile(filePath, 'utf-8');
  const json = JSON.parse(content);

  if (json.columns) {
    const columns = {};
    let colIndex = 0;
    console.time('Tempo creazione colonne');
    for (const [colName, col] of Object.entries(json.columns)) {
      //const normColName = normalizeColName(colName);
      const dbCol = await db.createColumn(
        tableId,
        colName,
        col.status || null,
        col.context || {},
        col.kind === 'entity',
        col.metadata || [],
        col.annotationMeta || {}
      );
      columns[colName] = dbCol.id;
      colIndex++;
    }
    console.timeEnd('Tempo creazione colonne');

    console.time('Tempo creazione celle');
    if (json.rows) {
  for (const [rowKey, row] of Object.entries(json.rows)) {
    if (!row.cells) continue;
    const rowIndex = parseInt(rowKey.replace('r', ''));
    for (const [colName, cell] of Object.entries(row.cells)) {
      //const normColName = normalizeColName(colName);
      const columnId = columns[colName];
      if (!columnId) continue;
      await db.createCell(
        columnId,
        rowIndex,
        cell.label,
        cell.metadata && cell.metadata[0] && cell.metadata[0].id ? cell.metadata[0].id : null,
        cell.metadata && cell.metadata[0] && cell.metadata[0].score ? cell.metadata[0].score : null,
        cell.metadata ? cell.metadata : [],
        cell.annotationMeta ? cell.annotationMeta : {}
      );
    }
  }
}
console.timeEnd('Tempo creazione celle');
  }
}

async function processExtensionJson(tableId, extensionFilePath) {
  const extContent = await fs.readFile(extensionFilePath, 'utf-8');
  const extJson = JSON.parse(extContent);

  const columnIds = {};
  const columnMetas = {};
  for (const meta of extJson.meta) {
    let isEntity = !!meta.type;
    let metadata = [meta];
    const col = await db.createColumn(
      tableId,
      meta.id,
      null,
      {},
      isEntity,
      metadata,
      {}
    );
    columnIds[meta.id] = col.id;
    columnMetas[meta.id] = meta;
  }

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

      if (isEntity) {
        bestMatchUri = first.id || null;
        bestMatchLabel = first.name || null;
      }

      await db.createTable(
        columnId,
        rowIndex,
        cellValue,
        bestMatchUri,
        null,           
        values,         
        {}
      );
    }
    rowIndex++;
  }
}

async function testAllQueryUseCase1() {

}

async function testQuery() {
  console.time('Tempo di esecuzione');
  const results = await db.getAllCandidatesByCellId(1);
  console.timeEnd('Tempo di esecuzione');
  console.dir(results, { depth: null, colors: true });
}

async function run() {
  //await processUsers();
  //await processDatasets();
  //await processTables();
  //await processColumnsAndResults(1, '1.json');
  //await processExtensionJson(1, path.join(dataDir, '1.extension.response.json'));
  await testQuery();
}

run().catch(console.error);

