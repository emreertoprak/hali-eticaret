import { readFile, writeFile } from 'node:fs/promises';

import JavaScriptObfuscator from 'javascript-obfuscator';

const file = 'dist/server.js';
const source = await readFile(file, 'utf8');
const result = JavaScriptObfuscator.obfuscate(source, {
  target: 'node',
  compact: true,
  stringArray: true,
  stringArrayThreshold: 0.5,
  identifierNamesGenerator: 'hexadecimal',
  sourceMap: false,
});
await writeFile(file, result.getObfuscatedCode());
console.log(`${file} obfuscate edildi.`);
