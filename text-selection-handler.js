
/**
 * Teksto pažymėjimo ir išsaugojimo funkcionalumo klasė
 */
class TextSelectionHandler {
    constructor() {
        this.APP_NAME = '[TextSelectionHandler]';
        this.STORAGE_KEY = 'savedSelections';
        console.log(`${this.APP_NAME} Inicijavimas...`);
        this.initializeSelectionListener();
        this.savedSelections = this.loadFromStorage();
        this.initializeViewButton();
    }

    initializeViewButton() {
        console.log(`${this.APP_NAME} Inicijuojamas peržiūros mygtukas`);
        const viewButton = document.getElementById('savedTextsButton');
        if (viewButton) {
            viewButton.addEventListener('click', () => this.showSavedTextsModal());
        }
    }

    initializeSelectionListener() {
		console.log(`${this.APP_NAME} Pridedamas teksto pažymėjimo klausytojas`);
		
		// Pridedame click handler'į vertimo popupui
		document.addEventListener('click', (e) => {
			const target = e.target;
			// Jei nėra aktyvaus pažymėjimo, leidžiame rodyti vertimo popupą
			if ((target.classList.contains('highlight-word') || 
				target.classList.contains('highlight-phrase')) && 
				window.getSelection().toString().trim().length === 0) {
				target.style.pointerEvents = 'auto';
				return;
			}
		});

		// Teksto pažymėjimo handler'is
		document.addEventListener('selectionchange', () => {
			const selection = window.getSelection();
			if (selection.toString().trim().length > 0) {
				this.handleSelection(selection);
			}
		});

		// Mobiliems įrenginiams
		let touchTimeout;
		document.addEventListener('touchstart', (e) => {
			const target = e.target;
			touchTimeout = setTimeout(() => {
				if (target.classList.contains('highlight-word') || 
					target.classList.contains('highlight-phrase')) {
					target.style.pointerEvents = 'none';
				}
			}, 200); // Trumpas timeout, kad būtų galima atskirti tap nuo ilgo paspaudimo
		});

		document.addEventListener('touchend', () => {
			clearTimeout(touchTimeout);
			setTimeout(() => {
				const selection = window.getSelection();
				if (selection.toString().trim().length > 0) {
					this.handleSelection(selection);
				} else {
					// Jei nėra pažymėjimo, grąžiname vertimo funkcionalumą
					document.querySelectorAll('.highlight-word, .highlight-phrase')
						.forEach(el => el.style.pointerEvents = 'auto');
				}
			}, 100);
		});
	}

    handleSelection(selection) {
        const selectedText = selection.toString().trim();
        if (selectedText.length === 0) return;

        const contextSentence = this.extractContextSentence(selection);
        this.showSaveButton(selection, selectedText, contextSentence);
    }

    extractContextSentence(selection) {
        const range = selection.getRangeAt(0);
		
		// Ieškome artimiausio tėvinio <p> elemento
		let containerNode = range.startContainer;
		while (containerNode && containerNode.nodeName !== 'P') {
			containerNode = containerNode.parentNode;
		}
		
		// Jei nerandam paragrafo, grąžinam tik pažymėtą tekstą
		if (!containerNode) {
			return selection.toString().trim();
		}
		
		const selectedText = selection.toString().trim();
		const paragraphText = containerNode.textContent;
		
		// Randame sakinio pradžią
		let sentenceStart = paragraphText.lastIndexOf('.', 
			paragraphText.indexOf(selectedText));
		sentenceStart = sentenceStart === -1 ? 0 : sentenceStart + 1;
		
		// Randame sakinio pabaigą
		let sentenceEnd = paragraphText.indexOf('.', 
			paragraphText.indexOf(selectedText) + selectedText.length);
		sentenceEnd = sentenceEnd === -1 ? paragraphText.length : sentenceEnd + 1;
		
		// Ištraukiame sakinį ir sutvarkome tarpus
		let sentence = paragraphText.slice(sentenceStart, sentenceEnd).trim();
		}
		
		return sentence;
	}

	showSaveButton(selection, selectedText, contextSentence) {
		const oldButton = document.querySelector('.selection-save-button');
		if (oldButton) oldButton.remove();

		const range = selection.getRangeAt(0);
		const rect = range.getBoundingClientRect();

		const button = document.createElement('button');
		button.className = 'selection-save-button';
		button.textContent = 'Išsaugoti';
		
		const verticalPosition = rect.top + window.scrollY - 50;
		const horizontalPosition = rect.left + (rect.width / 2);
		
		button.style.position = 'absolute';
		button.style.top = `${verticalPosition}px`;
		button.style.left = `${horizontalPosition}px`;
		button.style.transform = 'translate(-50%, -100%)';

		button.addEventListener('click', () => {
			this.saveSelection(selectedText, contextSentence);
			button.remove();
			window.getSelection().removeAllRanges();
		});

		document.body.appendChild(button);
		setTimeout(() => button.remove(), 3000);
	}

	showSavedTextsModal() {
	console.log(`${this.APP_NAME} Rodomas išsaugotų tekstų modalinis langas`);
        const modal = document.createElement('div');
        modal.className = 'saved-texts-modal';
        
        modal.innerHTML = `
            <h3>Išsaugoti tekstai</h3>
            <div class="saved-texts-list">
                ${this.savedSelections.length === 0 ? 
                    '<div class="no-saved-texts">Nėra išsaugotų tekstų</div>' :
                    this.savedSelections.map(selection => `
                        <div class="saved-text-item">
                            <strong>${selection.text}</strong>
                            <p>${selection.context}</p>
                        </div>
                    `).join('')
                }
            </div>
            <div class="modal-buttons">
                ${this.savedSelections.length > 0 ? `
                    <button class="clear-btn">Išvalyti viską</button>
                    <button class="download-btn">Atsisiųsti</button>
                ` : ''}
                <button class="close-btn">Uždaryti</button>
            </div>
        `;

        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        
        this.attachModalListeners(modal, overlay);

        document.body.appendChild(overlay);
        document.body.appendChild(modal);
    }

    attachModalListeners(modal, overlay) {
        modal.querySelector('.close-btn').addEventListener('click', () => {
            modal.remove();
            overlay.remove();
        });
        
        const downloadBtn = modal.querySelector('.download-btn');
        if (downloadBtn) {
            downloadBtn.addEventListener('click', () => {
                this.exportSelections();
            });
        }

        const clearBtn = modal.querySelector('.clear-btn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                if (confirm('Ar tikrai norite ištrinti visus išsaugotus tekstus?')) {
                    this.clearAllSelections();
                    modal.remove();
                    overlay.remove();
                    this.showSaveConfirmation('Visi tekstai ištrinti');
                }
            });
        }
        
        overlay.addEventListener('click', () => {
            modal.remove();
            overlay.remove();
        });
    }

    saveSelection(selectedText, contextSentence) {
        console.log(`${this.APP_NAME} Išsaugomas tekstas:`, selectedText);
        const selection = {
            text: selectedText,
            context: contextSentence,
            timestamp: new Date().toISOString()
        };

        this.savedSelections.push(selection);
        this.saveToStorage();
        this.showSaveConfirmation();
    }

    loadFromStorage() {
        try {
            const saved = localStorage.getItem(this.STORAGE_KEY);
            return saved ? JSON.parse(saved) : [];
        } catch (error) {
            console.error(`${this.APP_NAME} Klaida nuskaitant išsaugotus tekstus:`, error);
            return [];
        }
    }

    saveToStorage() {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.savedSelections));
        } catch (error) {
            console.error(`${this.APP_NAME} Klaida išsaugant tekstus:`, error);
            this.showError('Nepavyko išsaugoti teksto');
        }
    }

    showSaveConfirmation(message = 'Tekstas išsaugotas!') {
        const confirmation = document.createElement('div');
        confirmation.className = 'save-confirmation';
        confirmation.textContent = message;
        document.body.appendChild(confirmation);

        setTimeout(() => {
            confirmation.style.opacity = '0';
            setTimeout(() => confirmation.remove(), 300);
        }, 2000);
    }

    clearAllSelections() {
        console.log(`${this.APP_NAME} Išvalomi visi išsaugoti tekstai`);
        this.savedSelections = [];
        this.saveToStorage();
    }

    showError(message) {
        console.error(`${this.APP_NAME} Klaida:`, message);
        const error = document.createElement('div');
        error.className = 'error';
        error.textContent = message;
        document.body.appendChild(error);
        setTimeout(() => error.remove(), 3000);
    }

    exportSelections() {
        try {
            console.log(`${this.APP_NAME} Eksportuojami tekstai`);
            const content = this.savedSelections.map(selection => 
                `${selection.text.trim()}\t${selection.context.trim()}\n`
            ).join('');

            const blob = new Blob([content], { type: 'text/plain; charset=utf-8' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = 'zodziai_sakiniai.txt';
            a.click();
            
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error(`${this.APP_NAME} Klaida eksportuojant tekstus:`, error);
            this.showError('Nepavyko eksportuoti tekstų');
        }
    }
}

export { TextSelectionHandler };
