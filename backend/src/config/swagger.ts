
import swaggerUi from 'swagger-ui-express';
import YAML from 'yaml';
import fs from 'fs';
import path from 'path';

const swaggerFile = path.join(
  process.cwd(),
  'docs',
  'openapi.yaml'
);

console.log('Swagger YAML path:', swaggerFile);

const yamlContent = fs.readFileSync(swaggerFile, 'utf8');
const swaggerDocument = YAML.parse(yamlContent);

console.log(
  'Loaded Swagger paths:',
  Object.keys(swaggerDocument.paths ?? {})
);

export { swaggerUi, swaggerDocument };
