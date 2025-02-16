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
		
		const wordsWithoutContext = [];
		
		unknownWords.forEach(word => {
			const sentences = []; // Saugosime visus rastus sakinius
			
			// Randame žodžio poziciją
			let currentIndex = 0;
			let bestSentence = null;
			let shortestLength = Infinity;
			
			// Ieškome visų sakinio variantų su šiuo žodžiu
			while ((currentIndex = text.toLowerCase().indexOf(word.toLowerCase(), currentIndex)) !== -1) {
				let sentenceStart = text.lastIndexOf('.', currentIndex);
				let questionStart = text.lastIndexOf('?', currentIndex);
				let exclamationStart = text.lastIndexOf('!', currentIndex);
				
				// Randame artimiausią sakinio pradžią
				sentenceStart = Math.max(
					sentenceStart === -1 ? 0 : sentenceStart + 1,
					questionStart === -1 ? 0 : questionStart + 1,
					exclamationStart === -1 ? 0 : exclamationStart + 1
				);

				// Ieškome sakinio pabaigos
				let periodEnd = text.indexOf('.', currentIndex);
				let questionEnd = text.indexOf('?', currentIndex);
				let exclamationEnd = text.indexOf('!', currentIndex);
				
				// Randame artimiausią sakinio pabaigą
				let sentenceEnd = Math.min(
					periodEnd === -1 ? text.length : periodEnd + 1,
					questionEnd === -1 ? text.length : questionEnd + 1,
					exclamationEnd === -1 ? text.length : exclamationEnd + 1
				);

				if (sentenceEnd === text.length) {
					sentenceEnd = text.length;
				}

				const sentence = text.slice(sentenceStart, sentenceEnd).trim();
				sentences.push(sentence);
				
				// Tikriname ar šis sakinys geresnis
				const wordCount = sentence.split(' ').length;
				if (wordCount <= 15) {
					bestSentence = sentence;
					break; // Radome trumpą sakinį, galime baigti paiešką
				} else if (wordCount < shortestLength) {
					shortestLength = wordCount;
					bestSentence = sentence;
				}
				
				currentIndex = sentenceEnd;
			}
			
			if (bestSentence) {
				this.sentences.set(word, new Set([bestSentence]));
			} else {
				// Bandome su brūkšneliu
				currentIndex = text.toLowerCase().indexOf(`-${word.toLowerCase()}`);
				if (currentIndex !== -1) {
					let sentenceStart = text.lastIndexOf('.', currentIndex);
					sentenceStart = sentenceStart === -1 ? 0 : sentenceStart + 1;
					
					let sentenceEnd = text.indexOf('.', currentIndex);
					sentenceEnd = sentenceEnd === -1 ? text.length : sentenceEnd + 1;
					
					bestSentence = text.slice(sentenceStart, sentenceEnd).trim();
					this.sentences.set(word, new Set([bestSentence]));
				} else {
					wordsWithoutContext.push(word);
				}
			}
		});

		console.log(`${this.APP_NAME} Apdorota ${this.sentences.size} žodžių`);
		console.log(`${this.APP_NAME} Nerasta ${unknownWords.length - this.sentences.size} žodžių`);
		console.log("Pirmi 20 žodžių be konteksto:", wordsWithoutContext.slice(0, 20));
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
