export class TextSelectionHandler {
    constructor() {
        this.STORAGE_KEY = 'savedSelections';
        this.initializeSelectionListener();
        this.savedSelections = this.loadFromStorage();
    }

    initializeSelectionListener() {
        document.addEventListener('selectionchange', () => {
            const selection = window.getSelection();
            if (selection.toString().trim().length > 0) {
                this.handleSelection(selection);
            }
        });

        // Papildomas klausytojas mobiliam pažymėjimui
        document.addEventListener('touchend', () => {
            setTimeout(() => {
                const selection = window.getSelection();
                if (selection.toString().trim().length > 0) {
                    this.handleSelection(selection);
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
        let node = range.startContainer;
        
        // Ieškome artimiausio elemento su tekstu
        while (node && (!node.textContent || node.textContent.trim().length === 0)) {
            node = node.parentNode;
        }
        
        if (!node) return selection.toString();
        
        const fullText = node.textContent;
        const selectedText = selection.toString();
        
        // Ištraukiame pilną sakinį
        const sentenceRegex = /[^.!?]+[.!?]+/g;
        const sentences = fullText.match(sentenceRegex) || [fullText];
        
        return sentences.find(sentence => 
            sentence.includes(selectedText.trim())
        ) || selectedText;
    }

    showSaveButton(selection, selectedText, contextSentence) {
        const oldButton = document.querySelector('.selection-save-button');
        if (oldButton) oldButton.remove();

        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        const button = document.createElement('button');
        button.className = 'selection-save-button';
        button.textContent = 'Išsaugoti';

        // Pozicionuojame virš pažymėto teksto
        const top = rect.top + window.scrollY - 40; // 40px virš teksto
        const left = rect.left + (rect.width / 2) - 40; // Centruojame

        button.style.position = 'absolute';
        button.style.top = `${top}px`;
        button.style.left = `${left}px`;

        button.addEventListener('click', () => {
            this.saveSelection(selectedText, contextSentence);
            button.remove();
            window.getSelection().removeAllRanges();
        });

        document.body.appendChild(button);

        // Automatiškai paslepiame po 3 sekundžių
        setTimeout(() => button.remove(), 3000);
    }

    saveSelection(selectedText, contextSentence) {
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
            console.error('Klaida nuskaitant išsaugotus tekstus:', error);
            return [];
        }
    }

    saveToStorage() {
        try {
            localStorage.setItem(this.STORAGE_KEY, 
                JSON.stringify(this.savedSelections)
            );
        } catch (error) {
            console.error('Klaida išsaugant tekstus:', error);
            this.showError('Nepavyko išsaugoti teksto');
        }
    }

    showSaveConfirmation() {
        const confirmation = document.createElement('div');
        confirmation.className = 'save-confirmation';
        confirmation.textContent = 'Tekstas išsaugotas!';
        document.body.appendChild(confirmation);

        setTimeout(() => {
            confirmation.style.opacity = '0';
            setTimeout(() => confirmation.remove(), 300);
        }, 2000);
    }

    showError(message) {
        const error = document.createElement('div');
        error.className = 'error';
        error.textContent = message;
        document.body.appendChild(error);
        setTimeout(() => error.remove(), 3000);
    }

    getAllSelections() {
        return this.savedSelections;
    }

    exportSelections() {
        try {
            const content = this.savedSelections.map(selection => (
                `Tekstas: ${selection.text}\n` +
                `Kontekstas: ${selection.context}\n` +
                `Data: ${new Date(selection.timestamp).toLocaleString('lt-LT')}\n\n`
            )).join('---\n');

            const blob = new Blob([content], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = 'išsaugoti-tekstai.txt';
            a.click();
            
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Klaida eksportuojant tekstus:', error);
            this.showError('Nepavyko eksportuoti tekstų');
        }
    }
}
