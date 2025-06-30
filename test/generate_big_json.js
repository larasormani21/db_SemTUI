import fs from 'fs';

const template = JSON.parse(fs.readFileSync('./test/data/3.json', 'utf-8'));
const newRows = {};
const columnNames = Object.keys(template.columns);

function generateMetadata(colName, i) {
  if (colName === "﻿buyer" || colName === "country" || colName === "locality") {
    return [
      {
        id: `wd:Q${10000 + i}`,
        match: true,
        name: {
          value: `${colName.toUpperCase()} ENTITY ${i}`,
          uri: `https://www.wikidata.org/wiki/Q${10000 + i}`
        },
        score: Math.random().toFixed(3)
      },
      {
        id: `wd:Q${20000 + i}`,
        match: false,
        name: {
          value: `${colName.toUpperCase()} ALT ${i}`,
          uri: `https://www.wikidata.org/wiki/Q${20000 + i}`
        },
        score: Math.random().toFixed(3)
      }
    ];
  }
  return [];
}

for (let i = 0; i < 10000; i++) {
  const cells = {};
  for (const colName of columnNames) {
    cells[colName] = {
      id: `r${i}$${colName}`,
      label: `${colName.toUpperCase()} ${i}`,
      metadata: generateMetadata(colName, i),
      annotationMeta: {}
    };
  }
  newRows[`r${i}`] = {
    id: `r${i}`,
    cells
  };
}

template.rows = newRows;

fs.writeFileSync('./test/data/4.json', JSON.stringify(template, null, 2));