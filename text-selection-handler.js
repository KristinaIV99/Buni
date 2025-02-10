class TextSelectionHandler {
    constructor() {
        this.initializeSelectionListener();
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
        const contextSentence = this.extractContextSentence(selection);
        this.showSaveButton(selection);
    }

    extractContextSentence(selection) {
        // Ištraukti pilną sakinį, kuriame yra pažymėtas tekstas
    }

    showSaveButton(selection) {
        // Sukurti ir parodyti popup mygtuką
    }

    saveSelection(selectedText, contextSentence) {
        // Išsaugoti į localStorage
    }
}
