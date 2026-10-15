import { mkdirSync, copyFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const target = new URL('../public/document-workers/',import.meta.url);
mkdirSync(target,{recursive:true});
copyFileSync(fileURLToPath(new URL('../node_modules/pdfjs-dist/build/pdf.worker.min.mjs',import.meta.url)),fileURLToPath(new URL('pdf.worker.min.mjs',target)));
