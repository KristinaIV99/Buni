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
    }

    handleSelection(selection) {
        const selectedText = selection.toString().trim();
        if (selectedText.length === 0) return;

        const contextSentence = this.extractContextSentence(selection);
        this.showSaveButton(selection, selectedText, contextSentence);
    }

    extractContextSentence(selection) {
        const range = selection.getRangeAt(0);
        const startNode = range.startContainer;
        
        // Gauname tekstą iš tėvinio elemento
        let fullText = startNode.textContent;
        if (!fullText) {
            fullText = startNode.parentElement.textContent;
        }

        // Ieškome sakinio ribų
        const sentences = fullText.match(/[^.!?]+[.!?]+/g) || [fullText];
        
        // Randame sakinį, kuriame yra pažymėtas tekstas
        const selectedText = selection.toString();
        return sentences.find(sentence => sentence.includes(selectedText)) || selectedText;
    }

    showSaveButton(selection, selectedText, contextSentence) {
        // Pašaliname seną mygtuką, jei toks yra
        const oldButton = document.querySelector('.selection-save-button');
        if (oldButton) oldButton.remove();

        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        const button = document.createElement('button');
        button.className = 'selection-save-button';
        button.textContent = 'Išsaugoti';
        button.style.position = 'fixed';
        button.style.left = `${rect.left + window.scrollX + (rect.width / 2)}px`;
        button.style.top = `${rect.top + window.scrollY - 30}px`;

        button.addEventListener('click', () => {
            this.saveSelection(selectedText, contextSentence);
            button.remove();
        });

        document.body.appendChild(button);

        // Automatiškai paslepiame mygtuką po 3 sekundžių
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
        const saved = localStorage.getItem(this.STORAGE_KEY);
        return saved ? JSON.parse(saved) : [];
    }

    saveToStorage() {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.savedSelections));
    }

    showSaveConfirmation() {
        const confirmation = document.createElement('div');
        confirmation.className = 'save-confirmation';
        confirmation.textContent = 'Tekstas išsaugotas!';
        document.body.appendChild(confirmation);

        setTimeout(() => confirmation.remove(), 2000);
    }

    // Metodai eksportui ir peržiūrai
    getAllSelections() {
        return this.savedSelections;
    }

    exportSelections() {
        const content = this.savedSelections.map(selection => 
            `Tekstas: ${selection.text}\nKontekstas: ${selection.context}\nData: ${new Date(selection.timestamp).toLocaleString()}\n\n`
        ).join('---\n');

        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = 'išsaugoti-tekstai.txt';
        a.click();
        
        URL.revokeObjectURL(url);
    }
}
