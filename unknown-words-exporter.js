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
		
		unknownWords.forEach(word => {
			const wordRegex = new RegExp(`[^.!?]*\\b${word}\\b[^.!?]*[.!?]`, 'gi');
			const matches = text.match(wordRegex);
			
			if (matches && matches.length > 0) {
				let bestSentence = null;
            
				// Ieškome trumpesnio, aiškesnio sakinio
				for (const sentence of matches) {
					const trimmed = sentence.trim();
					const wordCount = trimmed.split(' ').length;
					
					// Trumpesnis sakinys (ne daugiau 15 žodžių)
					if (wordCount <= 15) {
						bestSentence = trimmed;
						break;
					}
				}
				
				// Jei neradome trumpo sakinio, ieškome bet kokio, kuris nėra per ilgas
				if (!bestSentence) {
					for (const sentence of matches) {
						const trimmed = sentence.trim();
						if (trimmed.split(' ').length <= 20) {
							bestSentence = trimmed;
							break;
						}
					}
				}
				
				// Jei vis dar neradome tinkamo sakinio, imame pirmą
				if (!bestSentence && matches.length > 0) {
					bestSentence = matches[0].trim();
				}

				this.sentences.set(word, new Set([bestSentence]));
			}
		});

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
