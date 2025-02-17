const DEBUG = true;  // arba false kai norėsime išjungti

import { TextNormalizer } from './text-normalizer.js';

export class TextReader {
    constructor(config = {}) {
        this.CLASS_NAME = '[TextReader]';
        
        this.config = {
            chunkSize: 1024 * 1024,
            maxFileSize: 100 * 1024 * 1024,
            allowedTypes: [
                'text/markdown',
                'text/plain',
                'application/octet-stream'
            ],
            encoding: 'utf-8',
            maxRetries: 3,
            workerEnabled: false,
            chunkOverlap: 1024,
            ...config
        };

        this.debugLog('Konfigūracija:', this.config);

        this.normalizer = new TextNormalizer();
        this.abortController = new AbortController();
        this.events = new EventTarget();
        this.worker = null;
        this._workerAvailable = false;
        this.activeJobId = 0;
        this.activeRequests = new Set();
        
        this.debugLog('Konstruktorius inicializuotas');
    }

    debugLog(...args) {
        if (DEBUG) {
            console.log(`${this.CLASS_NAME} [DEBUG]`, ...args);
        }
    }

    async readFile(file) {
        this.debugLog('Pradedamas failo skaitymas:', file.name);
        this._validateFile(file);
        
        try {
            const text = await this._readWithProgress(file);
            this.debugLog('Failo skaitymas baigtas');
            return text;
        } finally {
            this._cleanup();
        }
    }

    _validateFile(file) {
        this.debugLog('Tikrinamas failas:', {
            pavadinimas: file.name,
            dydis: file.size,
            tipas: file.type,
            plėtinys: file.name.split('.').pop()
        });

        if (file.size > this.config.maxFileSize) {
            throw new Error(`Failas viršija ${this.config.maxFileSize/1024/1024}MB ribą`);
        }

        if (!this.config.allowedTypes.includes(file.type)) {
            if (file.name.toLowerCase().endsWith('.md')) {
                return;
            }
            throw new Error(`Netinkamas failo formatas: ${file.type}`);
        }
    }

    async _readWithProgress(file) {
        this.debugLog('Pradedamas progresyvus skaitymas');
        const offsets = Array.from(
            { length: Math.ceil(file.size / this.config.chunkSize) },
            (_, i) => i * this.config.chunkSize
        );

        this.debugLog('Sukurti dalių offsetai:', offsets.length);

        const chunks = await Promise.all(
            offsets.map(offset => this._readChunkWithRetry(file, offset))
        );

        const rawText = chunks.join('');
    
		// Prieš normalizavimą
		this.debugLog('TEKSTAS PRIEŠ NORMALIZAVIMĄ:', rawText.substring(0, 200));
        
        const normalizedText = this.normalizer.normalizeMarkdown(rawText);

        // Po normalizavimo
		this.debugLog('TEKSTAS PO NORMALIZAVIMO:', normalizedText.substring(0, 200));
        
        return normalizedText;
    }

    async _readChunkWithRetry(file, offset, attempt = 1) {
        try {
            const chunk = await this._readChunk(file, offset);
            this._dispatchProgress(file, offset + this.config.chunkSize);
            return chunk;
        } catch (error) {
            this.debugLog('Klaida skaitant dalį (bandymas ' + attempt + '):', error);
            if (attempt <= this.config.maxRetries) {
                return this._readChunkWithRetry(file, offset, attempt + 1);
            }
            throw error;
        }
    }

    _readChunk(file, offset) {
        this.debugLog('Skaitoma failo dalis:', offset);
        return new Promise((resolve, reject) => {
            if (this.abortController.signal.aborted) {
                reject(new DOMException('Operation aborted', 'AbortError'));
                return;
            }

            const reader = new FileReader();
            const slice = file.slice(
                offset, 
                offset + this.config.chunkSize + this.config.chunkOverlap
            );

            reader.onload = () => {
                this.debugLog('Dalies skaitymas baigtas:', offset);
                resolve(reader.result);
            };
            reader.onerror = () => reject(reader.error);
            reader.onabort = () => reject(new DOMException('Operation aborted', 'AbortError'));

            const abortHandler = () => {
                reader.abort();
                reject(new DOMException('Operation aborted', 'AbortError'));
            };

            this.abortController.signal.addEventListener('abort', abortHandler, { once: true });
            reader.readAsText(slice, this.config.encoding);
        });
    }

    _dispatchProgress(file, loaded) {
        const percent = loaded >= file.size ? 100 : 
            Math.round((loaded / file.size) * 100);

        this.debugLog('Progreso atnaujinimas:', percent + '%');
        this.events.dispatchEvent(new CustomEvent('progress', {
            detail: { percent, loaded, total: file.size }
        }));
    }

    abort() {
        this.debugLog('Nutraukiamas skaitymas');
        this.activeRequests.forEach(jobId => {
            if (this.worker) {
                this.worker.postMessage({ type: 'cancel', jobId });
            }
        });
        this.activeRequests.clear();

        if (this.worker) {
            this.worker.terminate();
        }

        this.abortController.abort();
    }

    _cleanup() {
        this.debugLog('Atliekamas išvalymas');
        this.abortController = new AbortController();
    }

    onProgress(callback) {
        this.events.addEventListener('progress', callback);
    }

    offProgress(callback) {
        this.events.removeEventListener('progress', callback);
    }
}
