import fs from 'fs/promises';
import path from 'path';
import bcrypt from 'bcrypt';
import * as db from '../db/index.js';
import { get } from 'http';
import { table } from 'console';
import { takeCoverage } from 'v8';


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

async function processDatasets(userId) {
  const filePath = path.join(dataDir, 'datasets.info.json');
  const content = await fs.readFile(filePath, 'utf-8');
  const json = JSON.parse(content);
  const datasets = json.datasets;
  for (const ds of Object.values(datasets)) {
    console.time('Tempo creazione dataset');
    await db.createDataset(userId, ds.name, ds.description);
    console.timeEnd('Tempo creazione dataset');
  }
}

async function processTables(datasetId) {
  const filePath = path.join(dataDir, 'tables.info.json');
  const content = await fs.readFile(filePath, 'utf-8');
  const json = JSON.parse(content);
  const tables = json.tables;
  for (const t of Object.values(tables)) {
    console.time('Tempo creazione tabella');
    await db.createTable(
      datasetId,
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
        col.status || 'empty',
        col.context || {},
        col.kind === 'entity',
        col.metadata || [],
        col.annotationMeta || {},
        col.sourceColumnId || null
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
      const t0 = Date.now();
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
  const sourceId = parseInt(await db.getIdByTableAndName(parseInt(await db.getIdByDatasetAndName(1, 'country_data')), 'Country'))
  console.time('Tempo creazione colonne estensione');
  for (const meta of extJson.meta) {
    let isEntity = !!meta.type;
    let metadata = [meta];
    const col = await db.createColumn(
      tableId,
      meta.id,
      'reconciliated',
      {},
      isEntity,
      metadata,
      {},
      sourceId || null
    );
    columnIds[meta.id] = col.id;
    columnMetas[meta.id] = meta;
  }
  console.timeEnd('Tempo creazione colonne estensione');
  let rowIndex = 0;
  console.time('Tempo creazione celle estensione');
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
      }

      await db.createCell(
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
  console.timeEnd('Tempo creazione celle estensione');
}

async function testUseCase1() {
  await processUsers();
  const userId = parseInt(await db.getIdByUser('test_user'), 10);
  await processDatasets(userId);
  const datasetId = parseInt(await db.getIdbyUserAndName(userId, 'Demo Dataset'), 10);
  await processTables(datasetId);
  const tableId = parseInt(await db.getIdByDatasetAndName(datasetId, 'country_data'), 10);
  await processColumnsAndResults(tableId, '1.json');
  await processExtensionJson(tableId, path.join(dataDir, '1.extension.response.json'));
  const CountryColumnId = parseInt(await db.getIdByTableAndName(tableId, 'Country'), 10);
  const newColId = parseInt(await db.getIdByTableAndName(tableId, 'independenceYears'), 10) + 1;
  const newColId2 = newColId + 1;
  const cellId = parseInt(await db.getIdByColumnIdAndRow(CountryColumnId, 0));

  const testCases = [
    { name: 'loginUser', fn: () => db.loginUser('test', 'test') },
    { name: 'getUserByUsername', fn: () => db.getUserByUsername('test') },
    { name: 'getIdByUser', fn: () => db.getIdByUser('test_user') },
    { name: 'getAllUsers', fn: () => db.getAllUsers() },
    { name: 'getUserById', fn: () => db.getUserById(userId) },
    { name: 'updateUser', fn: () => db.updateUser(userId, 'test_user', 'test_password') },

    { name: 'updateDataset', fn: () => db.updateDataset(datasetId, 'Use case 1 dataset', 'Use case 1: small table') },
    { name: 'getAllDatasets', fn: () => db.getAllDatasets() },
    { name: 'getDatasetById', fn: () => db.getDatasetById(datasetId) },
    { name: 'getDatasetsByUserId', fn: () => db.getDatasetsByUserId(userId) },
    { name: 'getIdbyUserAndName', fn: () => db.getIdbyUserAndName(userId, 'Use case 1 dataset') },
    { name: 'getDatasetByName', fn: () => db.getDatasetByName('Use case 1 dataset') },
    { name: 'getDatasetByNameAndUser', fn: () => db.getDatasetByNameAndUser(userId, 'Use case 1 dataset') },

    {
      name: 'updateTableName', fn: async () =>
        db.updateTableName(tableId, 'country_table')
    },
    {
      name: 'updateRDF', fn: async () =>
        db.updateRDF(tableId,
          {
            'base_uri': 'https://example.org/',
            'match_value': 'all',
            'score_value': 0.5,
            'content': '<http://example.com/bob> <http://example.com/knows> <http://example.com/john> .'
          }
        )
    },
    { name: 'getAllTables', fn: () => db.getAllTables() },
    { name: 'getTablesByDatasetId', fn: () => db.getTablesByDatasetId(datasetId) },
    { name: 'getIdByDatasetAndName', fn: () => db.getIdByDatasetAndName(datasetId, 'country_table') },
    { name: 'getTableById', fn: () => db.getTableById(tableId) },
    { name: 'searchTablesByName', fn: () => db.searchTablesByName('countr') },
    { name: 'searchTablesByUserAndName', fn: () => db.searchTablesByUserAndName(userId, 'coun') },

    {
      name: 'createColumn', fn: async () =>
        db.createColumn(
          tableId,
          'test_column',
          'reconciliated',
          { 'contextKey': 'contextValue' },
          true,
          [
            {
              'id': 'id1',
              'name': 'name1',
              "type": [{ "id": "id2", "match": true, "score": 1 }],
              "property": [{ "id": "p1", "obj": "test_column2", "name": "p1", "match": true, "score": 0.9 }]
            }
          ],
          {},
          null
        )
    },
    { name: 'createColumn', fn: async () => db.createColumn(tableId, 'test_col2') },
    { name: 'updateColumnName', fn: async () => db.updateColumnName(newColId2, 'test_column2') },
    { name: 'addPropertyToColumn', fn: async () => db.addPropertyToColumn(newColId2, 'p2', 'test_column', true, 0.8) },
    { name: 'deletePropertyFromColumn', fn: () => db.deletePropertyFromColumn(newColId2, 'p2') },

    { name: 'getAllColumns', fn: () => db.getAllColumns() },
    { name: 'getColumnsByTableId', fn: () => db.getColumnsByTableId(tableId) },
    { name: 'getColumnById', fn: () => db.getColumnById(CountryColumnId) },
    { name: 'getColumnByName', fn: () => db.getColumnByName(tableId, 'Country') },
    { name: 'getIdByTableAndName', fn: () => db.getIdByTableAndName(tableId, 'Country') },
    { name: 'getReconciliatedColumnsByTableId', fn: () => db.getReconciliatedColumnsByTableId(tableId) },
    { name: 'getPropertiesFromColumn', fn: () => db.getPropertiesFromColumn(CountryColumnId) },
    { name: 'getAllPropertiesOfTable', fn: () => db.getAllPropertiesOfTable(tableId) },
    { name: 'getMetadataByColumnId', fn: () => db.getMetadataByColumnId(CountryColumnId) },
    { name: 'getExtendedColumnsBySource', fn: () => db.getExtendedColumnsBySource(CountryColumnId) },

    { name: 'createCell', fn: () => db.createCell(newColId, 0, 'test_cell') },
    { name: 'updateCellLabel', fn: async () => db.updateCellLabel(parseInt(await db.getIdByColumnIdAndRow(newColId, 0)), 'updated_cell') },
    {
      name: 'updateReconciliationResultById', fn: async () =>
        db.updateReconciliationResultById(
          parseInt(await db.getIdByColumnIdAndRow(newColId, 0)),
          'Q0', 0.9,
          [
            { id: 'Q0', name: 'Italy', score: 0.9, match: true },
            { id: 'Q1', name: 'Italy', score: 0.8, match: false }
          ],
          { 'annotationKey': 'annotationValue' }
        )
    },
    {
      name: 'updateMatchById', fn: async () =>
        db.updateMatchById(
          parseInt(await db.getIdByColumnIdAndRow(newColId, 0)),
          'Q1', 0.8
        )
    },

    { name: 'getAllResults', fn: () => db.getAllResults() },
    { name: 'getResultsByColumnId', fn: () => db.getResultsByColumnId(CountryColumnId) },
    { name: 'getResultsByTableId', fn: () => db.getResultsByTableId(tableId) },
    { name: 'getIdByColumnIdAndRow', fn: () => db.getIdByColumnIdAndRow(CountryColumnId, 0) },
    { name: 'getResultById', fn: () => db.getResultById(cellId) },
    { name: 'getMatchInfoByCellId', fn: () => db.getMatchInfoByCellId(cellId) },
    { name: 'countResultsByColumnId', fn: () => db.countResultsByColumnId(CountryColumnId) },
    { name: 'countResultsByTableId', fn: () => db.countResultsByTableId(tableId) },
    { name: 'getResultsWithMinScore', fn: () => db.getResultsWithMinScore(0.5) },
    { name: 'getResultsWithMinScoreByColumnId', fn: () => db.getResultsWithMinScoreByColumnId(CountryColumnId, 0.5) },
    { name: 'getCandidatesByCellId', fn: () => db.getCandidatesByCellId(cellId) },
    { name: 'getCandidatesWithMinScore', fn: () => db.getCandidatesWithMinScore(0.5) },
    { name: 'getCandidatesWithMinScoreByColumnId', fn: () => db.getCandidatesWithMinScoreByColumnId(CountryColumnId, 0.5) },
    { name: 'searchCellsByValuePrefix', fn: () => db.searchCellsByValuePrefix('It', CountryColumnId) },
    { name: 'searchCandidatesByLabelSubstring', fn: () => db.searchCandidatesByLabelSubstring('Italy', CountryColumnId) },
    { name: 'deleteColumn', fn: () => db.deleteColumn(newColId) },
    { name: 'deleteTable', fn: () => db.deleteTable(tableId) },
    { name: 'deleteDataset', fn: () => db.deleteDataset(datasetId) },
    { name: 'deleteUser', fn: () => db.deleteUser(userId) },
  ];

  for (const test of testCases) {
    console.time(test.name);
    try {
      const result = await test.fn();
      //console.log(test.name, result);
    } catch (e) {
      console.error(test.name, 'errore:', e);
    }
    console.timeEnd(test.name);
  }
}

async function testUseCase2and3(tableName, fileName) {
  await processUsers();
  const userId = parseInt(await db.getIdByUser('test_user'), 10);
  await processDatasets(userId);
  const datasetId = parseInt(await db.getIdbyUserAndName(userId, 'Demo Dataset'), 10);
  await processTables(datasetId);
  const tableId = parseInt(await db.getIdByDatasetAndName(datasetId, tableName), 10);
  await processColumnsAndResults(tableId, fileName);
  const CountryColumnId = parseInt(await db.getIdByTableAndName(tableId, '﻿buyer'), 10);
  const newColId = parseInt(await db.getIdByTableAndName(tableId, 'country'), 10) + 1;
  const newColId2 = newColId + 1;
  const cellId = parseInt(await db.getIdByColumnIdAndRow(CountryColumnId, 0));

  const testCases = [
    { name: 'loginUser', fn: () => db.loginUser('test', 'test') },
    { name: 'getUserByUsername', fn: () => db.getUserByUsername('test') },
    { name: 'getIdByUser', fn: () => db.getIdByUser('test_user') },
    { name: 'getAllUsers', fn: () => db.getAllUsers() },
    { name: 'getUserById', fn: () => db.getUserById(userId) },
    { name: 'updateUser', fn: () => db.updateUser(userId, 'test_user', 'test_password') },

    { name: 'updateDataset', fn: () => db.updateDataset(datasetId, 'Use case 1 dataset', 'Use case 1: small table') },
    { name: 'getAllDatasets', fn: () => db.getAllDatasets() },
    { name: 'getDatasetById', fn: () => db.getDatasetById(datasetId) },
    { name: 'getDatasetsByUserId', fn: () => db.getDatasetsByUserId(userId) },
    { name: 'getIdbyUserAndName', fn: () => db.getIdbyUserAndName(userId, 'Use case 1 dataset') },
    { name: 'getDatasetByName', fn: () => db.getDatasetByName('Use case 1 dataset') },
    { name: 'getDatasetByNameAndUser', fn: () => db.getDatasetByNameAndUser(userId, 'Use case 1 dataset') },

    {
      name: 'updateTableName', fn: async () =>
        db.updateTableName(tableId, 'country_table')
    },
    {
      name: 'updateRDF', fn: async () =>
        db.updateRDF(tableId,
          {
            'base_uri': 'https://example.org/',
            'match_value': 'all',
            'score_value': 0.5,
            'content': '<http://example.com/bob> <http://example.com/knows> <http://example.com/john> .'
          }
        )
    },
    { name: 'getAllTables', fn: () => db.getAllTables() },
    { name: 'getTablesByDatasetId', fn: () => db.getTablesByDatasetId(datasetId) },
    { name: 'getIdByDatasetAndName', fn: () => db.getIdByDatasetAndName(datasetId, 'country_table') },
    { name: 'getTableById', fn: () => db.getTableById(tableId) },
    { name: 'searchTablesByName', fn: () => db.searchTablesByName('countr') },
    { name: 'searchTablesByUserAndName', fn: () => db.searchTablesByUserAndName(userId, 'coun') },

    {
      name: 'createColumn', fn: async () =>
        db.createColumn(
          tableId,
          'test_column',
          'reconciliated',
          { 'contextKey': 'contextValue' },
          true,
          [
            {
              'id': 'id1',
              'name': 'name1',
              "type": [{ "id": "id2", "match": true, "score": 1 }],
              "property": [{ "id": "p1", "obj": "test_column2", "name": "p1", "match": true, "score": 0.9 }]
            }
          ],
          {},
          null
        )
    },
    { name: 'createColumn', fn: async () => db.createColumn(tableId, 'test_col2') },
    { name: 'updateColumnName', fn: async () => db.updateColumnName(newColId2, 'test_column2') },
    { name: 'addPropertyToColumn', fn: async () => db.addPropertyToColumn(newColId2, 'p2', 'test_column', true, 0.8) },
    { name: 'deletePropertyFromColumn', fn: () => db.deletePropertyFromColumn(newColId2, 'p2') },

    { name: 'getAllColumns', fn: () => db.getAllColumns() },
    { name: 'getColumnsByTableId', fn: () => db.getColumnsByTableId(tableId) },
    { name: 'getColumnById', fn: () => db.getColumnById(CountryColumnId) },
    { name: 'getColumnByName', fn: () => db.getColumnByName(tableId, 'Country') },
    { name: 'getIdByTableAndName', fn: () => db.getIdByTableAndName(tableId, 'Country') },
    { name: 'getReconciliatedColumnsByTableId', fn: () => db.getReconciliatedColumnsByTableId(tableId) },
    { name: 'getPropertiesFromColumn', fn: () => db.getPropertiesFromColumn(CountryColumnId) },
    { name: 'getAllPropertiesOfTable', fn: () => db.getAllPropertiesOfTable(tableId) },
    { name: 'getMetadataByColumnId', fn: () => db.getMetadataByColumnId(CountryColumnId) },
    { name: 'getExtendedColumnsBySource', fn: () => db.getExtendedColumnsBySource(CountryColumnId) },

    { name: 'createCell', fn: () => db.createCell(newColId, 0, 'test_cell') },
    { name: 'updateCellLabel', fn: async () => db.updateCellLabel(parseInt(await db.getIdByColumnIdAndRow(newColId, 0)), 'updated_cell') },
    {
      name: 'updateReconciliationResultById', fn: async () =>
        db.updateReconciliationResultById(
          parseInt(await db.getIdByColumnIdAndRow(newColId, 0)),
          'Q0', 0.9,
          [
            { id: 'Q0', name: 'Italy', score: 0.9, match: true },
            { id: 'Q1', name: 'Italy', score: 0.8, match: false }
          ],
          { 'annotationKey': 'annotationValue' }
        )
    },
    {
      name: 'updateMatchById', fn: async () =>
        db.updateMatchById(
          parseInt(await db.getIdByColumnIdAndRow(newColId, 0)),
          'Q1', 0.8
        )
    },

    { name: 'getAllResults', fn: () => db.getAllResults() },
    { name: 'getResultsByColumnId', fn: () => db.getResultsByColumnId(CountryColumnId) },
    { name: 'getResultsByTableId', fn: () => db.getResultsByTableId(tableId) },
    { name: 'getIdByColumnIdAndRow', fn: () => db.getIdByColumnIdAndRow(CountryColumnId, 0) },
    { name: 'getResultById', fn: () => db.getResultById(cellId) },
    { name: 'getMatchInfoByCellId', fn: () => db.getMatchInfoByCellId(cellId) },
    { name: 'countResultsByColumnId', fn: () => db.countResultsByColumnId(CountryColumnId) },
    { name: 'countResultsByTableId', fn: () => db.countResultsByTableId(tableId) },
    { name: 'getResultsWithMinScore', fn: () => db.getResultsWithMinScore(0.5) },
    { name: 'getResultsWithMinScoreByColumnId', fn: () => db.getResultsWithMinScoreByColumnId(CountryColumnId, 0.5) },
    { name: 'getCandidatesByCellId', fn: () => db.getCandidatesByCellId(cellId) },
    { name: 'getCandidatesWithMinScore', fn: () => db.getCandidatesWithMinScore(0.5) },
    { name: 'getCandidatesWithMinScoreByColumnId', fn: () => db.getCandidatesWithMinScoreByColumnId(CountryColumnId, 0.5) },
    { name: 'searchCellsByValuePrefix', fn: () => db.searchCellsByValuePrefix('It', CountryColumnId) },
    { name: 'searchCandidatesByLabelSubstring', fn: () => db.searchCandidatesByLabelSubstring('Italy', CountryColumnId) },
    { name: 'deleteColumn', fn: () => db.deleteColumn(newColId) },
    { name: 'deleteTable', fn: () => db.deleteTable(tableId) },
    { name: 'deleteDataset', fn: () => db.deleteDataset(datasetId) },
    { name: 'deleteUser', fn: () => db.deleteUser(userId) },
  ];

  for (const test of testCases) {
    console.time(test.name);
    try {
      const result = await test.fn();
      //console.log(test.name, result);
    } catch (e) {
      console.error(test.name, 'errore:', e);
    }
    console.timeEnd(test.name);
  }
}

async function testQuery() {
  console.time('Tempo di esecuzione');
  const results = await db.getReconciliatedColumnsByTableId(2);
  console.dir(results), { depth: null, colors: true };
}

async function run() {
  await testUseCase1('country_table', '1.json')
  await testUseCase2and3('big_table_null', '2.json')
  await testUseCase2and3('big_table', '3.json')
  //await testUseCase2and3('bigger_table', '4.json')
}

run().catch(console.error);

