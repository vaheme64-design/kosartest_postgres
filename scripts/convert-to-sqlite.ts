import * as fs from 'fs';
import * as path from 'path';

const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');
let content = fs.readFileSync(schemaPath, 'utf8');

// Ensure provider is sqlite
content = content.replace(/provider\s*=\s*"postgresql"/g, 'provider = "sqlite"');

// Remove @db.* attributes
content = content.replace(/\s+@db\.[A-Za-z0-9_]+\([^)]*\)/g, '');
content = content.replace(/\s+@db\.[A-Za-z0-9_]+/g, '');

// Replace String[] with Json for list fields
content = content.replace(/applicableCategories\s+String\[\]/g, 'applicableCategories Json');
content = content.replace(/selectedColumns\s+String\[\]/g, 'selectedColumns Json');
content = content.replace(/groupBy\s+String\[\]/g, 'groupBy Json');

fs.writeFileSync(schemaPath, content, 'utf8');
console.log('Successfully converted schema.prisma to SQLite.');
