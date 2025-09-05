import { compileFromFile } from 'json-schema-to-typescript';
import fs from 'node:fs';

const schemaName = '.schedule.schema.json';

// If it does not exist, download it
if (!fs.existsSync(schemaName)) {
    console.log('Downloading schema...');
    const url = await fetch('https://c3voc.de/schedule/schema.json');
    const schema = await url.text();
    fs.writeFileSync(schemaName, schema);
}

const ts = await compileFromFile(schemaName, {
    style: {
        semi: true,
        singleQuote: true,
        useTabs: false,
        tabWidth: 4,
        trailingComma: 'all',
        printWidth: 80,
    },
    customName: (schema, keyNameFromDefinition) => {
        const name = schema.title || schema.$id || keyNameFromDefinition;

        if (!name) {
            return name;
        }

        if (name.startsWith('http://') || name.startsWith('https://')) {
            return 'C3VocSchedule';
        }
        return name;
    },
});
fs.writeFileSync('src/schedule.d.ts', ts);
