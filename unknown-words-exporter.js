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
			const sentences = [];
			let currentIndex = 0;
			let bestSentence = null;
			let shortestLength = Infinity;
			
			while ((currentIndex = text.toLowerCase().indexOf(word.toLowerCase(), currentIndex)) !== -1) {
				// Ieškome sakinio pradžios nuo bet kurio sakinio pabaigos ženklo
				let sentenceStart = currentIndex;
				while (sentenceStart > 0) {
					const char = text.charAt(sentenceStart - 1);
					if (char === '.' || char === '!' || char === '?') {
						const nextChar = text.charAt(sentenceStart);
						if (/[A-ZÅÄÖ]/.test(nextChar)) {
							break;
						}
					}
					sentenceStart--;
				}
				sentenceStart = Math.max(0, sentenceStart);
				
				// Ieškome sakinio pabaigos
				let sentenceEnd = currentIndex;
				while (sentenceEnd < text.length) {
					const char = text.charAt(sentenceEnd);
					if (char === '.' || char === '!' || char === '?') {
						sentenceEnd++;
						break;
					}
					sentenceEnd++;
				}
				
				const sentence = text.slice(sentenceStart, sentenceEnd).trim();
				
				// Tikriname sakinio tinkamumą
				if (/^[A-ZÅÄÖ]/.test(sentence) && sentence.length > word.length + 10) {
					const wordCount = sentence.split(' ').length;
					if (wordCount <= 15) {
						bestSentence = sentence;
						break;
					} else if (wordCount < shortestLength) {
						shortestLength = wordCount;
						bestSentence = sentence;
					}
				}
				
				currentIndex = sentenceEnd;
			}
			
			if (bestSentence) {
				this.sentences.set(word, new Set([bestSentence]));
			} else {
				wordsWithoutContext.push(word);
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
