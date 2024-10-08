import { DuneClient } from "@duneanalytics/client-sdk";
import { createObjectCsvWriter as createCsvWriter } from 'csv-writer';

const dune = new DuneClient("wNd9BFb4pSm6p3HMHk0bieYpE57q9DuU");
const query_result = await dune.getLatestResult({queryId: 4043904});

const rows = query_result.result.rows;
const columnNames = query_result.result.metadata.column_names;

const csvWriter = createCsvWriter({
    path: 'output.csv',
    header: columnNames.map(name => ({ id: name, title: name }))
});

await csvWriter.writeRecords(rows);

console.log('CSV file written successfully');

