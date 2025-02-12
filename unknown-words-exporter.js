export class UnknownWordsExporter {
    constructor() {
        this.APP_NAME = '[UnknownWordsExporter]';
        this.sentences = new Map();
    }

    cleanSentence(sentence) {
        return sentence
            .replace(/^["']|["']$/g, '')
            .replace(/[#*_\[\]•]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    processText(text, unknownWords) {
		console.log(`${this.APP_NAME} Pradedu teksto apdorojimą`);
		console.log(`Viso nežinomų žodžių: ${unknownWords.length}`);
    
		// Padalinkime tekstą į sakinius iš anksto
		const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
    
		// Sukuriame žodžių lookup objektą greitesnei paieškai
		const sentenceMap = new Map();
    
		// Prafiltruojame sakinius pagal žodžius
		sentences.forEach(sentence => {
			const lowerSentence = sentence.toLowerCase();
			unknownWords.forEach(word => {
				if (lowerSentence.includes(word.toLowerCase())) {
					sentenceMap.set(word, sentence.trim());
				}
			});
		});
    
		// Išsaugome rezultatus
		this.sentences = sentenceMap;

		console.log(`${this.APP_NAME} Apdorota ${this.sentences.size} žodžių`);
	console.log(`${this.APP_NAME} Nerasta ${unknownWords.length - this.sentences.size} žodžių`);
	}

    exportToTxt() {
        console.log(`${this.APP_NAME} Pradedu eksportavimą`);
        let content = '';
        
        for (let [word, sentencesSet] of this.sentences) {
            const sentence = Array.from(sentencesSet)[0];
            if (sentence) {
                const cleanedSentence = this.cleanSentence(sentence);
                content += `${word}\t${cleanedSentence}\n`;
            }
        }

        if (content === '') {
            console.log(`${this.APP_NAME} KLAIDA: Nėra turinio eksportavimui`);
            return;
        }

        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'nezinomi_zodziai.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        console.log(`${this.APP_NAME} Eksportuota ${this.sentences.size} nežinomų žodžių su sakiniais`);
    }
}
