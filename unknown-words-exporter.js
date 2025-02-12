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
		
		const wordsWithoutContext = []; // Pridedame masyvą čia
		
		unknownWords.forEach(word => {
			// DEBUG: Patikriname ar žodis iš viso yra tekste
			const simpleSearch = text.toLowerCase().includes(word.toLowerCase());
			const hasHyphen = text.toLowerCase().includes(`-${word.toLowerCase()}`) || 
							text.toLowerCase().includes(`${word.toLowerCase()}-`);
			
			if (!simpleSearch) {
				console.log(`Žodis "${word}" nerastas paprastoje paieškoje`);
			} else {
				console.log(`Žodis "${word}" RASTAS tekste, bet nerandamas regex`);
			}
			if (hasHyphen) {
				console.log(`Žodis "${word}" rastas su brūkšneliu`);
			}

			// Sutvarkome specialius simbolius ir raides
			const escapedWord = word
				.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
				.replace(/[åäöÅÄÖéèÉÈ]/g, char => {
					switch(char.toLowerCase()) {
						case 'å': return '[åÅ]';
						case 'ä': return '[äÄ]';
						case 'ö': return '[öÖ]';
						case 'é': return '[éÉ]';
						case 'è': return '[èÈ]';
						default: return char;
					}
				});
				
			// Ieškome žodžio arba žodžio su brūkšneliu (kaip vieno žodžio)
			const wordWithHyphen = escapedWord.replace(/(\w+)/, '$1-\\w+');
			const wordRegex = new RegExp(`[^.!?]*?(${escapedWord}|${wordWithHyphen})[^.!?]*[.!?]`, 'gi');
			const matches = text.match(wordRegex);
			
			if (matches && matches.length > 0) {
				let bestSentence = null;
				let shortestLength = Infinity;
				
				for (const sentence of matches) {
					const trimmed = sentence.trim();
					const wordCount = trimmed.split(' ').length;
					
					if (wordCount <= 15) {
						bestSentence = trimmed;
						break;
					}
					else if (wordCount < shortestLength) {
						shortestLength = wordCount;
						bestSentence = trimmed;
					}
				}
				this.sentences.set(word, new Set([bestSentence]));
			} else {
				wordsWithoutContext.push(word);
			}
		});

		console.log(`${this.APP_NAME} Apdorota ${this.sentences.size} žodžių`);
		console.log(`${this.APP_NAME} Nerasta ${unknownWords.length - this.sentences.size} žodžių`);
		console.log("Pirmi 20 žodžių be konteksto:", wordsWithoutContext.slice(0, 20));
		
		// Debug informacija apie žodžius be konteksto
		wordsWithoutContext.slice(0, 5).forEach(word => {
			const index = text.toLowerCase().indexOf(word.toLowerCase());
			if (index !== -1) {
				// Paimame 50 simbolių prieš ir po žodžio
				const start = Math.max(0, index - 50);
				const end = Math.min(text.length, index + word.length + 50);
				console.log(`Žodžio "${word}" aplinka tekste:`, text.slice(start, end));
			} else {
				console.log(`Žodis "${word}" nerastas tekste iš viso!`);
			}
		});
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
