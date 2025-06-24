import fs from 'fs/promises';
import path from 'path';
import bcrypt from 'bcrypt';
import { loginUser, getUserByUsername, createUser, getAllUsers, getUserById, updateUserPassword} from '../db/users.js';
import { createDataset, getAllDatasets, getDatasetById, getDatasetByName, getDatasetByNameAndUser, getDatasetsByUserId, updateDataset } from '../db/datasets.js';
import { createTable, getTableById, getTablesByDatasetId, getTablesByNameAndUser, updateTableName, printTableByTableId } from '../db/tables.js';
import { createColumn } from '../db/column.js';
import { createResult, updateCellLabel } from '../db/reconciliation_results.js';
import { get } from 'http';


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
    const existing = await getUserByUsername(username);
    if (existing) continue;
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    await createUser(username, passwordHash);
  }
}

async function processDatasets() {
  const filePath = path.join(dataDir, 'datasets.info.json');
  const content = await fs.readFile(filePath, 'utf-8');
  const json = JSON.parse(content);
  const datasets = json.datasets;
  for (const ds of Object.values(datasets)) {
    await createDataset(ds.userId, ds.name, ds.description);
  }
}

async function processTables() {
  const filePath = path.join(dataDir, 'tables.info.json');
  const content = await fs.readFile(filePath, 'utf-8');
  const json = JSON.parse(content);
  const tables = json.tables;
  for (const t of Object.values(tables)) {
    await createTable(
      t.idDataset,
      t.name,
      t.nCols || 0,
      t.nRows || 0,
      t.nCells || 0,
      t.nCellsReconciliated || 0
    );
  }
}

async function processColumnsAndResults() {
  const filePath = path.join(dataDir, '0.json');
  const content = await fs.readFile(filePath, 'utf-8');
  const json = JSON.parse(content);

  // Columns
  if (json.columns) {
    const columns = {}; // nome -> id
    let colIndex = 0;
    for (const [colName, col] of Object.entries(json.columns)) {
      const dbCol = await createColumn(
        1,
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
    // Reconciliation Results
    if (json.rows && json.rows.rows) {
  for (const [rowKey, row] of Object.entries(json.rows.rows)) {
    if (!row.cells) continue;
    const rowIndex = parseInt(rowKey.replace('r', ''));
    for (const [colName, cell] of Object.entries(row.cells)) {
      const columnId = columns[colName];
      if (!columnId) continue;
      await createResult(
        columnId,
        rowIndex,
        cell.label,
        cell.metadata && cell.metadata[0] && cell.metadata[0].name && cell.metadata[0].name.uri ? cell.metadata[0].name.uri : null,
        cell.metadata && cell.metadata[0] && cell.metadata[0].name && cell.metadata[0].name.value ? cell.metadata[0].name.value : null,
        cell.metadata && cell.metadata[0] && cell.metadata[0].score ? cell.metadata[0].score : null,
        cell.metadata ? JSON.stringify(cell.metadata) : '[]',
        cell.annotationMeta ? JSON.stringify(cell.annotationMeta) : '{}'
      );
    }
  }
}
  }
}

async function testQueries() {
  console.time('Tempo di esecuzione');
  const results = await updateCellLabel(1, "Sam");
  console.timeEnd('Tempo di esecuzione');
  console.log(results);
}

async function run() {
  // await processUsers();
  // await processDatasets();
  //await processTables();
  //await processColumnsAndResults();
  await testQueries();
  await printTableByTableId(1);
}

run().catch(console.error);
