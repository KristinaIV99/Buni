// main.js
const DEBUG = true; // Galima pakeisti į false išjungti detalius pranešimus

// Logger klasė konsolės pranešimų valdymui
class Logger {
    constructor(prefix = '') {
        this.prefix = prefix;
    }

    log(...args) {
        if (DEBUG) {
            console.log(this.prefix, ...args);
        }
    }

    error(...args) {
        // Klaidos visada rodomos, nepriklausomai nuo DEBUG
        console.error(this.prefix, ...args);
    }

    warn(...args) {
        // Įspėjimai visada rodomi, nepriklausomai nuo DEBUG
        console.warn(this.prefix, ...args);
    }
}

import { TextNormalizer } from './text-normalizer.js';
import { TextReader } from './text-reader.js';
import { HtmlConverter } from './html-converter.js';
import { DictionaryManager } from './dictionary-manager.js';
import { TextStatistics } from './text-statistics.js';
import { UnknownWordsExporter } from './unknown-words-exporter.js';
import { TextPaginator } from './text-paginator.js';
import { TextHighlighter } from './text-highlighter.js';
import { TextSelectionHandler } from './text-selection-handler.js';
import { StateManager } from './state-manager.js';

class App {
    constructor() {
        this.APP_NAME = '[App]';
        this.logger = new Logger(this.APP_NAME);  // Pridėta logger inicializacija
        this.reader = new TextReader();
        this.htmlConverter = new HtmlConverter();
        this.dictionaryManager = new DictionaryManager();
        this.textStatistics = new TextStatistics();
        this.unknownWordsExporter = new UnknownWordsExporter();
        this.paginator = new TextPaginator({
            pageSize: 2000,
            onPageChange: (pageData) => this.updatePageContent(pageData)
        });
        this.textHighlighter = new TextHighlighter(this.dictionaryManager);
        this.textSelectionHandler = new TextSelectionHandler();
        this.stateManager = new StateManager();
        
        this.isProcessing = false;
        this.currentText = '';
        this.loadedFiles = new Set();
        this.currentFileName = '';
        
        this.logger.log('Konstruktorius inicializuotas');
        this.initUI();
        this.bindEvents();
        this.initializeBookState().then(() => {
			if (!this.currentText) {
				this.loadDefaultDictionaries();
			}
		});
	}

    initUI() {
		this.logger.log('Inicializuojami UI elementai...');
		
		this.fileInput = document.getElementById('fileInput');
		this.content = document.getElementById('content');
		this.dictionaryList = document.getElementById('dictionaryList');
		this.dictionaryStats = document.getElementById('dictionaryStats');
		this.wordSearchInput = document.getElementById('wordSearch');
		this.searchResults = document.getElementById('searchResults');
		
		this.exportButton = document.createElement('button');
		this.exportButton.textContent = 'Eksportas';
		this.exportButton.className = 'export-button';
		this.exportButton.style.display = 'none';
		document.body.appendChild(this.exportButton);
		
		this.progressBar = document.createElement('div');
		this.progressBar.className = 'progress-bar';
		document.body.prepend(this.progressBar);

		this.paginationControls = document.createElement('div');
		this.paginationControls.className = 'pagination-controls';
		this.paginationControls.innerHTML = `
			<button class="prev-page">&#8592;</button>
			<span class="page-info">1 / 1</span>
			<button class="next-page">&#8594;</button>
		`;
		
		// Įterpiame slankiklį tarp mygtukų
		const slider = this.paginator.initializeSlider();
		this.paginationControls.insertBefore(slider, 
			this.paginationControls.querySelector('.page-info'));
			
		this.paginationControls.style.display = 'none';
		document.body.appendChild(this.paginationControls);

		document.addEventListener('click', (e) => {
			const popup = document.querySelector('.word-info-popup');
			if (popup && !e.target.closest('.word-info-popup') && !e.target.closest('.highlight-word') && !e.target.closest('.highlight-phrase')) {
				popup.remove();
			}
		});
		
		this.logger.log('UI elementai sėkmingai inicializuoti');
	}

    bindEvents() {
        this.logger.log('Prijungiami įvykių klausytojai...');

        this.fileInput.addEventListener('change', (e) => this.handleFile(e));
        this.reader.events.addEventListener('progress', (e) => this.updateProgress(e.detail));
        this.exportButton.addEventListener('click', () => this.handleExport());

        const prevBtn = this.paginationControls.querySelector('.prev-page');
        const nextBtn = this.paginationControls.querySelector('.next-page');
        prevBtn.addEventListener('click', () => {
            this.logger.log('Pereinama į ankstesnį puslapį');
            this.paginator.previousPage();
        });
        nextBtn.addEventListener('click', () => {
            this.logger.log('Pereinama į kitą puslapį');
            this.paginator.nextPage();
        });
        
        if (this.wordSearchInput) {
            this.wordSearchInput.addEventListener('input', () => this.handleWordSearch());
        }

        this.logger.log('Įvykių klausytojai sėkmingai prijungti');
    }

    async loadDefaultDictionaries() {
        try {
			this.logger.log('Įkeliami numatytieji žodynai...')
			
			// Pirma įkeliam visus žodynus
			const wordsResponse = await fetch('./words.json');
			const wordsBlob = await wordsResponse.blob();
			const wordsFile = new File([wordsBlob], 'words.json', { type: 'application/json' });
			
			const phrasesResponse = await fetch('./phrases.json');
			const phrasesBlob = await phrasesResponse.blob();
			const phrasesFile = new File([phrasesBlob], 'phrases.json', { type: 'application/json' });

			// Įkeliam žodžius ir frazes
			await this.dictionaryManager.loadDictionaries([wordsFile, phrasesFile]);
			
			this.loadedFiles.add('words.json');
			this.loadedFiles.add('phrases.json');
			
			this.updateDictionaryList();
			this.updateDictionaryStats();
			
			this.logger.log('Numatytieji žodynai sėkmingai įkelti');
		} catch (error) {
			this.logger.error('Klaida įkeliant žodynus:', error);
		}
	}

    saveLastPage(pageNumber) {
		// Išsaugome naują būseną su atnaujintu puslapiu
		this.stateManager.saveBookState({
			text: this.currentText,
			fileName: this.currentFileName,
			lastPage: pageNumber,
			highlights: this.textHighlighter.saveHighlights()
		});
		this.logger.log('Išsaugotas puslapis:', pageNumber);
	}

    getLastPage() {
		// Patikriname ar yra išsaugota būsena
		const savedState = this.stateManager.loadBookState();
		if (savedState && savedState.fileName === this.currentFileName) {
			return {
				pageNumber: savedState.lastPage || 1,
				fileName: savedState.fileName
			};
		}
		// Jei nėra išsaugotos būsenos, grąžiname numatytuosius
		return {
			pageNumber: 1,
			fileName: ''
		};
	}

    async initializeBookState() {
		this.logger.log('Pradedama knygos būsenos inicializacija');
		const savedState = this.stateManager.loadBookState();
		if (!savedState) return;

		try {
		// Nustatome pradinius duomenis
			this.currentFileName = savedState.fileName;
			this.currentText = savedState.text;

			// Paraleliai vykdome žodynų įkėlimą ir HTML konvertavimą
			const [_, html] = await Promise.all([
				this.loadDefaultDictionaries(),
				this.htmlConverter.convertToHtml(this.currentText)
			]);

			// Kai turime žodynus, atliekame statistikos skaičiavimus
			const knownWords = this.dictionaryManager.getDictionaryWords();
			const textStats = this.textStatistics.calculateStats(this.currentText, knownWords);

			// Pritaikome pažymėjimus
			const processedHtml = await this.textHighlighter.processText(
				this.currentText, 
				html,
				savedState.highlights
			);

			// Nustatome turinį ir mygtukus
			this.setContent(processedHtml, textStats);

			const savedTextsButton = document.getElementById('savedTextsButton');
			if (savedTextsButton) {
				savedTextsButton.style.display = 'block';
			}

			if (textStats.unknownWords > 0 && this.exportButton) {
				this.exportButton.style.display = 'block';
			}

			// Nustatome puslapį pačiame gale
			if (savedState.lastPage) {
				setTimeout(() => {
					this.paginator.goToPage(savedState.lastPage);
				}, 0);
			}

		} catch (error) {
			this.logger.error('Klaida atkuriant knygos būseną:', error);
			this.stateManager.clearBookState();
		}
	}

    async handleFile(e) {
		try {
			if(this.isProcessing) {
				this.logger.warn('Atšaukiama esama užklausa...');
				this.reader.abort();
			}
			
			this.isProcessing = true;
			this.fileInput.disabled = true;
			this.showLoadingState();
			
			const file = e.target.files[0];
			if(!file) {
				this.logger.warn('Nepasirinktas failas');
				return;
			}
			
			this.debugLog('Pradedamas failo apdorojimas:', file.name);
			this.currentFileName = file.name;
			
			const lastPage = this.getLastPage();
			if (lastPage.fileName === file.name) {
				this.debugLog('Rastas paskutinis skaitytas puslapis:', lastPage.pageNumber);
				this.paginator.goToPage(lastPage.pageNumber);
			}
			
			const text = await this.reader.readFile(file);
			this.debugLog('Failas nuskaitytas, teksto ilgis:', text.length);
			this.currentText = text;
			
			// Skaičiuojame teksto statistiką
			this.debugLog('Pradedamas teksto statistikos skaičiavimas');
			const knownWords = this.dictionaryManager.getDictionaryWords();
			const textStats = this.textStatistics.calculateStats(text, knownWords);
			this.debugLog('Teksto statistika:', textStats);
			
			// Rodome žodyno mygtuką kai įkeliama knyga
			const savedTextsButton = document.getElementById('savedTextsButton');
			if (savedTextsButton) {
				savedTextsButton.style.display = 'block';
				this.debugLog('Įjungtas išsaugotų tekstų mygtukas');
			}
			if (textStats.unknownWords > 0 && this.exportButton) {
				this.exportButton.style.display = 'block';
				this.debugLog('Įjungtas eksporto mygtukas, nežinomų žodžių:', textStats.unknownWords);
			}

			// Ieškome žodžių ir frazių
			this.debugLog('Pradedama žodžių ir frazių paieška');
			const { results, searchStats } = await this.dictionaryManager.findInText(text);
			this.debugLog('Paieškos rezultatai:', { rastiFrazių: results.length, paieškosLaikas: searchStats });
			
			// Konvertuojame į HTML
			this.debugLog('Pradedama konversija į HTML');
			const html = await this.htmlConverter.convertToHtml(text);
			this.debugLog('HTML konversija baigta, ilgis:', html.length);
			
			this.setContent(html, textStats);

			// Išsaugome būseną su pažymėjimais PO turinio nustatymo
			const highlights = this.textHighlighter.saveHighlights();
			this.debugLog('Išsaugomi pažymėjimai:', highlights.length);
			
			this.stateManager.saveBookState({
				text: this.currentText,
				fileName: this.currentFileName,
				lastPage: this.paginator.getCurrentPage(),
				highlights: highlights
			});
			this.debugLog('Būsena išsaugota');

		} catch(error) {
			this.debugLog('KLAIDA apdorojant failą:', error);
			this.handleError(error);
		} finally {
			this.isProcessing = false;
			this.fileInput.disabled = false;
			this.fileInput.value = '';
			this.hideLoadingState();
			this.debugLog('Failo apdorojimas baigtas');
		}
	}

    async setContent(html, stats = {}) {
		this.logger.log('Nustatomas naujas turinys...');
		
		const div = document.createElement('div');
		div.className = 'text-content';

		// Statistikos dalis
		if (stats && Object.keys(stats).length > 0) {
			const statsDiv = document.createElement('div');
			statsDiv.className = 'text-stats';
			statsDiv.innerHTML = `
				<div class="stat-item">
					<div class="stat-value">${stats.totalWords || 0}</div>
					<div class="stat-label">Iš viso žodžių</div>
				</div>
				<div class="stat-item">
					<div class="stat-value">${stats.uniqueWords || 0}</div>
					<div class="stat-label">Unikalių žodžių</div>
				</div>
				<div class="stat-item">
					<div class="stat-value">${stats.unknownWords || 0}</div>
					<div class="stat-label">Nežinomų žodžių</div>
				</div>
				<div class="stat-item">
					<div class="stat-value">${stats.unknownPercentage || 0}%</div>
					<div class="stat-label">Nežinomų žodžių %</div>
				</div>
			`;
			div.appendChild(statsDiv);
		}

		 // Tekstas su žymėjimais
		const highlightedHtml = await this.textHighlighter.processText(this.currentText, html);
		this.logger.log('Pažymėtas tekstas:', highlightedHtml.slice(0, 200));
		
		const contentDiv = document.createElement('div');
		contentDiv.className = 'paginated-content';
		contentDiv.innerHTML = highlightedHtml;
		
		div.appendChild(contentDiv);
		
		const pageData = this.paginator.setContent(contentDiv.innerHTML);
		this.logger.log('Puslapiavimo duomenys:', pageData);

		contentDiv.innerHTML = pageData.content;
		
		this.content.replaceChildren(div);
		this.updatePageContent(pageData);
	}
	_addWordInfoPopup(element, info) {
		element.addEventListener('click', (e) => {
			const popup = document.createElement('div');
			popup.className = 'word-info-popup';
			
			if (info.meanings) {
				// Homonimų rodymas
				popup.innerHTML = `
					<div class="popup-title">${info.text}</div>
					${info.meanings.map(meaning => `
						<div class="meaning-item">
							<div class="kalbos-dalis">${meaning["kalbos dalis"]}</div>
							<div>Vertimas: ${meaning.vertimas}</div>
							<div>Bazinė forma: ${meaning["bazinė forma"]}</div>
							<div>Bazės vertimas: ${meaning["bazė vertimas"]}</div>
						<div>CERF: ${meaning.CERF}</div>
						</div>
					`).join('')}
				`;
			} else {
				// Paprastas žodis/frazė
				popup.innerHTML = `
					<div class="popup-title">${info.text}</div>
					<div>Vertimas: ${info.vertimas}</div>
					<div>Bazinė forma: ${info["bazinė forma"]}</div>
					<div>Bazės vertimas: ${info["bazė vertimas"]}</div>
					<div>CERF: ${info.CERF}</div>
				`;
			}
			
			// Pozicionuojame popupą
			popup.style.position = 'absolute';
			popup.style.left = `${e.pageX}px`;
			popup.style.top = `${e.pageY}px`;
			
			document.body.appendChild(popup);
			
			// Uždarome popupą paspaudus kitur
			const closePopup = () => {
				popup.remove();
				document.removeEventListener('click', closePopup);
			};
			setTimeout(() => document.addEventListener('click', closePopup), 0);
		});
	}

    updatePageContent(pageData) {
        const contentDiv = document.querySelector('.paginated-content');
		if (!contentDiv) return;
		
		contentDiv.innerHTML = pageData.content;
        
        this.saveLastPage(pageData.currentPage);
		
		const pageInfo = this.paginationControls.querySelector('.page-info');
		pageInfo.textContent = `${pageData.currentPage} / ${pageData.totalPages}`;
		
		// Atnaujinti slankiklį
		this.paginator.updateSlider();
		
		this.paginationControls.style.display = 
			pageData.totalPages > 1 ? 'flex' : 'none';
	}

    async handleExport() {
		try {
			const knownWords = this.dictionaryManager.getDictionaryWords();
			// Gauname nežinomus žodžius
			const unknownWords = this.textStatistics.getUnknownWords(this.currentText, knownWords);
			 this.logger.log("Nežinomų žodžių kiekis:", unknownWords.length);

			// Perduodame originalų tekstą ir nežinomus žodžius į eksporterį
			this.unknownWordsExporter.processText(this.currentText, unknownWords);
			this.unknownWordsExporter.exportToTxt();
			
			this.logger.log('Nežinomi žodžiai eksportuoti sėkmingai');
		} catch(error) {
			this.logger.error('Klaida eksportuojant nežinomus žodžius:', error);
			this.showError('Klaida eksportuojant nežinomus žodžius');
		}
	}

    async handleDictionaryFiles(e) {
        const files = Array.from(e.target.files);
        
        try {
            for (const file of files) {
                if (this.loadedFiles.has(file.name)) {
                    this.logger.warn(`Žodynas ${file.name} jau įkeltas`);
                    continue;
                }

                this.logger.log(`Įkeliamas žodynas: ${file.name}`);
                const result = await this.dictionaryManager.loadDictionary(file);
                this.loadedFiles.add(file.name);
                
                this.updateDictionaryList();
                this.updateDictionaryStats();
            }
        } catch (error) {
            this.logger.error('Klaida įkeliant žodynus:', error);
            this.showError(`Klaida įkeliant žodyną: ${error.message}`);
        }
        
        this.dictionaryInput.value = '';
    }

    async handleWordSearch() {
		const text = this.wordSearchInput.value.trim();
		if (!text) {
			this.searchResults.innerHTML = '';
			return;
		}

		try {
			const { results, stats } = await this.dictionaryManager.findInText(text);
			this.logger.log('Paieškos laikas:', stats.searchTimeMs, 'ms');
			this.displaySearchResults(results);
		} catch (error) {
			this.showError(`Klaida ieškant: ${error.message}`);
		}
	}

    displaySearchResults(results) {
        if (!this.searchResults) return;
		
		let html = '<div class="search-results">';
		
		if (results.length > 0) {
			results.forEach(result => {
				html += `
					<div class="search-item ${result.type}-section">
						<div class="pattern">${result.pattern}</div>
						<div class="info">
							<div>Vertimas: ${result.info.vertimas}</div>
							<div>CERF: ${result.info.CERF}</div>
						</div>
						${result.related.length > 0 ? `
							<div class="related">
								<div>Susiję:</div>
								${result.related.map(r => `
									<span>${r.pattern} (${r.type})</span>
								`).join('')}
							</div>
						` : ''}
					</div>
				`;
			});
		} else {
			html += '<div class="no-results">Nieko nerasta</div>';
		}
		
		html += '</div>';
		this.searchResults.innerHTML = html;
	}

    renderDictionaryGroup(dictionary, isPhrase) {
        return `<div class="dictionary-group ${isPhrase ? 'phrases' : 'words'}">
            <h4>${dictionary.dictionary}</h4>
            ${dictionary.matches.map(match => `
                <div class="match-item">
                    <div class="match-header">
                        <strong>${match.word}</strong>
                        <span class="cerf-badge">${match.CERF || 'N/A'}</span>
                    </div>
                    <div class="match-details">
                        <div>Vertimas: ${match.vertimas}</div>
                        <div>Kalbos dalis: ${match['kalbos dalis']}</div>
                        <div>Bazinė forma: ${match['bazinė forma']}</div>
                        <div>Bazės vertimas: ${match['bazė vertimas']}</div>
                    </div>
                </div>
            `).join('')}
        </div>`;
    }

    updateDictionaryList() {
        if (!this.dictionaryList) return;

        const dictionaries = this.dictionaryManager.getDictionaryList();
        this.dictionaryList.innerHTML = dictionaries.map(dict => `
            <div class="dictionary-item">
                <div class="dictionary-info">
                    <span class="dictionary-name">${dict.name}</span>
                    <span class="dictionary-count">${dict.entries} įrašų</span>
                </div>
                < onclick="window.app.removeDictionary('${dict.name}')" class="remove-">
                    Šalinti
                </>
            </div>
        `).join('');
    }

    updateDictionaryStats() {
        if (!this.dictionaryStats) return;

        const stats = this.dictionaryManager.getStatistics();
        this.dictionaryStats.innerHTML = `
            <div class="stats-container">
                <div class="stats-item">
                    <span class="stats-label">Žodžių:</span>
                    <span class="stats-value">${stats.totalWords}</span>
                </div>
                <div class="stats-item">
                    <span class="stats-label">Frazių:</span>
                    <span class="stats-value">${stats.totalPhrases}</span>
                </div>
                <div class="stats-item">
                    <span class="stats-label">Žodynų:</span>
                    <span class="stats-value">${stats.loadedDictionaries}</span>
                </div>
            </div>
        `;
    }

    removeDictionary(name) {
        if (this.dictionaryManager.removeDictionary(name)) {
            this.loadedFiles.delete(name);
            this.updateDictionaryList();
            this.updateDictionaryStats();
            this.logger.log(`Žodynas pašalintas: ${name}`);
        }
    }

    handleError(error) {
        this.logger.error('Klaida:', error);
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error';
        errorDiv.textContent = `Klaida: ${error.message}`;
        this.content.replaceChildren(errorDiv);
    }

    showError(message) {
        this.logger.warn('Klaidos pranešimas:', message);
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        this.content.insertAdjacentElement('afterbegin', errorDiv);
        setTimeout(() => errorDiv.remove(), 5000);
    }

    updateProgress({ percent }) {
        if (this.progressBar) {
            this.progressBar.style.width = `${percent}%`;
            if(percent >= 100) {
                setTimeout(() => {
                    this.progressBar.style.width = '0%';
                }, 500);
            }
        }
    }

    showLoadingState() {
        this.logger.log('Rodoma įkėlimo būsena...');
        const loader = document.createElement('div');
        loader.className = 'loading';
        loader.innerHTML = '<p>Kraunama...</p>';
        this.content.replaceChildren(loader);
    }

    hideLoadingState() {
        this.logger.log('Paslepiama įkėlimo būsena');
        const loader = this.content.querySelector('.loading');
        if(loader) loader.remove();
    }
}

window.addEventListener('DOMContentLoaded', () => {
    const logger = new Logger('[Main]');
    logger.log('Aplikacija inicializuojama...');
    window.app = new App();
});
