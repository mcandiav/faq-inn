import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Rutas posibles del archivo VERSION (monorepo local vs imagen Docker). */
const VERSION_CANDIDATES = [
  join(__dirname, '../../VERSION'), // /app/VERSION en Docker
  join(__dirname, '../../../VERSION'), // raíz del repo en desarrollo
];

export function readProductVersion() {
  for (const file of VERSION_CANDIDATES) {
    try {
      const value = readFileSync(file, 'utf8').trim();
      if (value) {
        return value;
      }
    } catch {
      /* siguiente candidato */
    }
  }
  return '0.0.0';
}
