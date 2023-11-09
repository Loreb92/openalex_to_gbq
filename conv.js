
import { readFileSync, writeFileSync } from 'fs';

function convertTSVtoJSON(input_tsv, output_json) {
    // Read the TSV file
    const tsv = readFileSync(input_tsv, 'utf-8');

    // Split the TSV into rows
    const rows = tsv.split('\n');

    // Get the header row
    const header = rows[0].split('\t');

    // Initialize the JSON schema object
    const schema = {
        type: 'object',
        properties: {},
    };

    // Loop through the rows and add each field to the schema
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i].split('\t');
        const field = {
            type: row[1],
            description: row[3],
        };
        if (row[2] === 'REQUIRED') {
            field.required = true;
        }
        if (row[0].includes('.')) {
            const parts = row[0].split('.');
            let obj = schema.properties;
            for (let j = 0; j < parts.length - 1; j++) {
                if (!obj[parts[j]]) {
                    obj[parts[j]] = {
                        type: 'object',
                        properties: {},
                    };
                }
                obj = obj[parts[j]].properties;
            }
            obj[parts[parts.length - 1]] = field;
        } else {
            schema.properties[row[0]] = field;
        }
    }

    // Write the JSON schema file
    writeFileSync(output_json, JSON.stringify(schema, null, 2));
}

// Pass the input_tsv and output_json arguments when calling the script with "node" command
const input_tsv = process.argv[2];
const output_json = process.argv[3];
convertTSVtoJSON(input_tsv, output_json);
