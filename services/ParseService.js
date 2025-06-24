// parseService.js
const ParseService = {
  parseUsers(json) {
    if (!json || !json.users) {
      throw new Error("Invalid input: missing 'users' property");
    }
    const usersObj = json.users;
    return Object.keys(usersObj).map(key => {
      const user = usersObj[key];
      return {
        id: user.id,
        username: user.username,
        password: user.password
      };
    });
  },

  parseDatasets(json) {
    if (!json || !json.datasets) {
      throw new Error("Invalid input: missing 'datasets' property");
    }
    const datasetsObj = json.datasets;
    return Object.keys(datasetsObj).map(key => {
      const ds = datasetsObj[key];
      return {
        id: ds.id,
        userId: ds.userId,
        name: ds.name,
        description: ds.description
      };
    });
  },

  parseTables(json) {
    if (!json || !json.tables) {
      throw new Error("Invalid input: missing 'tables' property");
    }
    const tablesObj = json.tables;
    return Object.keys(tablesObj).map(key => {
      const t = tablesObj[key];
      return {
        id: t.id,
        idDataset: t.idDataset,
        name: t.name
      };
    });
  },

  parseColumns(json) {
    if (!json || !json.columns) {
      throw new Error("Invalid input: missing 'columns' property");
    }
    const columnsObj = json.columns;
    return Object.keys(columnsObj).map(key => {
      const c = columnsObj[key];
      return {
        id: c.id,
        label: c.label,
        status: c.status,
        context: c.context,
        metadata: c.metadata,
        annotationMeta: c.annotationMeta,
        kind: c.kind
      };
    });
  },

  parseReconciliationResults(json) {
    if (!json || !json.rows) {
      throw new Error("Invalid input: missing 'rows' property");
    }
    const results = [];
    const rowsObj = json.rows;
    Object.values(rowsObj).forEach(row => {
      const rowIndex = row.id;
      const cells = row.cells;
      Object.entries(cells).forEach(([columnId, cell]) => {
        results.push({
          columnId: columnId,
          rowIndex: rowIndex,
          cellValue: cell.label,
          bestMatchUri: cell.metadata && cell.metadata[0] && cell.metadata[0].name && cell.metadata[0].name.uri ? cell.metadata[0].name.uri : null,
          bestMatchLabel: cell.metadata && cell.metadata[0] && cell.metadata[0].name && cell.metadata[0].name.value ? cell.metadata[0].name.value : null,
          score: cell.metadata && cell.metadata[0] && cell.metadata[0].score ? cell.metadata[0].score : null,
          candidates: cell.metadata ? cell.metadata : [],
          annotationMeta: cell.annotationMeta ? cell.annotationMeta : {}
        });
      });
    });
    return results;
  }
};

export default ParseService;
