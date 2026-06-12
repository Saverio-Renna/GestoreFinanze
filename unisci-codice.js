const fs = require('fs');
const path = require('path');

// Configurazione: cartelle e file da ignorare
const IGNORE_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.expo', '.next']);
const IGNORE_FILES = new Set(['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'unisci-codice.js', '.DS_Store']);
// Estensioni di codice che vuoi includere
const ALLOWED_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx', '.json', '.css', '.html', '.env']);

const OUTPUT_FILE = path.join(__dirname, 'codice_completo.txt');

// Svuota il file di output se esiste già
fs.writeFileSync(OUTPUT_FILE, '');

function scanDirectory(currentDir) {
    const files = fs.readdirSync(currentDir);

    for (const file of files) {
        const fullPath = path.join(currentDir, file);
        const stat = fs.statSync(fullPath);
        const relativePath = path.relative(__dirname, fullPath);

        if (stat.isDirectory()) {
            if (!IGNORE_DIRS.has(file)) {
                scanDirectory(fullPath);
            }
        } else {
            const ext = path.extname(file);
            if (!IGNORE_FILES.has(file) && ALLOWED_EXTENSIONS.has(ext)) {
                // Scrive il percorso del file come intestazione
                fs.appendFileSync(OUTPUT_FILE, `\n\n=========================================\n`);
                fs.appendFileSync(OUTPUT_FILE, `FILE: ${relativePath}\n`);
                fs.appendFileSync(OUTPUT_FILE, `=========================================\n\n`);
                
                // Legge e scrive il contenuto del file
                const content = fs.readFileSync(fullPath, 'utf-8');
                fs.appendFileSync(OUTPUT_FILE, content);
            }
        }
    }
}

console.log('Generazione del file in corso...');
scanDirectory(__dirname);
console.log(`Completato! Tutto il codice è stato salvato in: ${OUTPUT_FILE}`);
