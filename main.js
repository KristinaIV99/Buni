// main.js
import { TextNormalizer } from './text-normalizer.js';
import { TextReader } from './text-reader.js';
import { HtmlConverter } from './html-converter.js';
import { DictionaryManager } from './dictionary-manager.js';
import { TextStatistics } from './text-statistics.js';
import { UnknownWordsExporter } from './unknown-words-exporter.js';
import { TextPaginator } from './text-paginator.js';
import { TextHighlighter } from './text-highlighter.js';

class App {
    constructor() {
        this.APP_NAME = '[App]';
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
        
        this.isProcessing = false;
        this.currentText = '';
        this.loadedFiles = new Set();
        this.currentFileName = '';
        
        console.log(`${this.APP_NAME} Konstruktorius inicializuotas`);
        this.initUI();
        this.bindEvents();
        this.loadDefaultDictionaries();
    }

    initUI() {
		console.log(`${this.APP_NAME} Inicializuojami UI elementai...`);
		
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
		
		console.log(`${this.APP_NAME} UI elementai sėkmingai inicializuoti`);
	}

    bindEvents() {
        console.log(`${this.APP_NAME} Prijungiami įvykių klausytojai...`);

        this.fileInput.addEventListener('change', (e) => this.handleFile(e));
        this.reader.events.addEventListener('progress', (e) => this.updateProgress(e.detail));
        this.exportButton.addEventListener('click', () => this.handleExport());

        const prevBtn = this.paginationControls.querySelector('.prev-page');
        const nextBtn = this.paginationControls.querySelector('.next-page');
        prevBtn.addEventListener('click', () => {
            console.log(`${this.APP_NAME} Pereinama į ankstesnį puslapį`);
            this.paginator.previousPage();
        });
        nextBtn.addEventListener('click', () => {
            console.log(`${this.APP_NAME} Pereinama į kitą puslapį`);
            this.paginator.nextPage();
        });
        
        if (this.wordSearchInput) {
            this.wordSearchInput.addEventListener('input', () => this.handleWordSearch());
        }

        console.log(`${this.APP_NAME} Įvykių klausytojai sėkmingai prijungti`);
    }

    async loadDefaultDictionaries() {
        try {
			console.log(`${this.APP_NAME} Įkeliami numatytieji žodynai...`);
			
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
			
			console.log(`${this.APP_NAME} Numatytieji žodynai sėkmingai įkelti`);
		} catch (error) {
			console.error(`${this.APP_NAME} Klaida įkeliant žodynus:`, error);
		}
	}

    saveLastPage(pageNumber) {
        localStorage.setItem('lastPageNumber', pageNumber);
        localStorage.setItem('lastFileName', this.currentFileName);
        console.log(`${this.APP_NAME} Išsaugotas puslapis:`, pageNumber);
    }

    getLastPage() {
        return {
            pageNumber: parseInt(localStorage.getItem('lastPageNumber')) || 1,
            fileName: localStorage.getItem('lastFileName')
        };
    }

    async handleFile(e) {
		try {
			if(this.isProcessing) {
				console.warn(`${this.APP_NAME} Atšaukiama esama užklausa...`);
				this.reader.abort();
			}
			
			this.isProcessing = true;
			this.fileInput.disabled = true;
			this.showLoadingState();
			
			const file = e.target.files[0];
			if(!file) {
				console.warn(`${this.APP_NAME} Nepasirinktas failas`);
				return;
			}
			
			this.currentFileName = file.name;
			
			const lastPage = this.getLastPage();
			if (lastPage.fileName === file.name) {
				this.paginator.goToPage(lastPage.pageNumber);
			}
			
			const text = await this.reader.readFile(file);
			this.currentText = text;
			
			// Skaičiuojame teksto statistiką
			const knownWords = this.dictionaryManager.getDictionaryWords();
			const textStats = this.textStatistics.calculateStats(text, knownWords);
			
			if (textStats.unknownWords > 0 && this.exportButton) {
				this.exportButton.style.display = 'block';
			}

			// Ieškome žodžių ir frazių
			const { results, searchStats } = await this.dictionaryManager.findInText(text);
			
			// Konvertuojame į HTML
			const html = await this.htmlConverter.convertToHtml(text);
			this.setContent(html, textStats);

		} catch(error) {
			console.error(`${this.APP_NAME} Klaida:`, error);
			this.handleError(error);
		} finally {
			this.isProcessing = false;
			this.fileInput.disabled = false;
			this.fileInput.value = '';
			this.hideLoadingState();
		}
	}

    async setContent(html, stats = {}) {
		console.log(`${this.APP_NAME} Nustatomas naujas turinys...`);
		
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
		console.log('Pažymėtas tekstas:', highlightedHtml.slice(0, 200));
		
		const contentDiv = document.createElement('div');
		contentDiv.className = 'paginated-content';
		contentDiv.innerHTML = highlightedHtml;
		
		div.appendChild(contentDiv);
		
		const pageData = this.paginator.setContent(contentDiv.innerHTML);
		 console.log('Puslapiavimo duomenys:', pageData);

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
			// Naudojame tą patį tekstą ir žodyną kaip statistikai
			const unknownWords = this.textStatistics.getUnknownWords(this.currentText, knownWords);

			// Apdorojame tekstą ir eksportuojame
			this.unknownWordsExporter.processText(this.currentText, unknownWords);
			this.unknownWordsExporter.exportToTxt();
			
			console.log(`${this.APP_NAME} Nežinomi žodžiai eksportuoti sėkmingai`);
		} catch(error) {
			console.error(`${this.APP_NAME} Klaida eksportuojant nežinomus žodžius:`, error);
			this.showError('Klaida eksportuojant nežinomus žodžius');
		}
	}

    async handleDictionaryFiles(e) {
        const files = Array.from(e.target.files);
        
        try {
            for (const file of files) {
                if (this.loadedFiles.has(file.name)) {
                    console.warn(`${this.APP_NAME} Žodynas ${file.name} jau įkeltas`);
                    continue;
                }

                console.log(`${this.APP_NAME} Įkeliamas žodynas: ${file.name}`);
                const result = await this.dictionaryManager.loadDictionary(file);
                this.loadedFiles.add(file.name);
                
                this.updateDictionaryList();
                this.updateDictionaryStats();
            }
        } catch (error) {
            console.error(`${this.APP_NAME} Klaida įkeliant žodynus:`, error);
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
			console.log('Paieškos laikas:', stats.searchTimeMs, 'ms');
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
            console.log(`${this.APP_NAME} Žodynas pašalintas: ${name}`);
        }
    }

    handleError(error) {
        console.error(`${this.APP_NAME} Klaida:`, error);
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error';
        errorDiv.textContent = `Klaida: ${error.message}`;
        this.content.replaceChildren(errorDiv);
    }

    showError(message) {
        console.warn(`${this.APP_NAME} Klaidos pranešimas:`, message);
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
        console.log(`${this.APP_NAME} Rodoma įkėlimo būsena...`);
        const loader = document.createElement('div');
        loader.className = 'loading';
        loader.innerHTML = '<p>Kraunama...</p>';
        this.content.replaceChildren(loader);
    }

    hideLoadingState() {
        console.log(`${this.APP_NAME} Paslepiama įkėlimo būsena`);
        const loader = this.content.querySelector('.loading');
        if(loader) loader.remove();
    }
}

window.addEventListener('DOMContentLoaded', () => {
    console.log('[Main] Aplikacija inicializuojama...');
    window.app = new App();
});
