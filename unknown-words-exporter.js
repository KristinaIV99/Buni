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
			// Randame žodžio poziciją
			const index = text.toLowerCase().indexOf(word.toLowerCase());
			
			if (index !== -1) {
				// Randame sakinio pradžią (ieškome taško prieš žodį)
				let sentenceStart = text.lastIndexOf('.', index);
				sentenceStart = sentenceStart === -1 ? 0 : sentenceStart + 1;
				
				// Randame sakinio pabaigą (ieškome taško po žodžio)
				let sentenceEnd = text.indexOf('.', index);
				sentenceEnd = sentenceEnd === -1 ? text.length : sentenceEnd + 1;
				
				// Ištraukiame sakinį
				const sentence = text.slice(sentenceStart, sentenceEnd).trim();
				
				this.sentences.set(word, new Set([sentence]));
			} else {
				// Bandome su brūkšneliu
				const hyphenIndex = text.toLowerCase().indexOf(`-${word.toLowerCase()}`);
				if (hyphenIndex !== -1) {
					let sentenceStart = text.lastIndexOf('.', hyphenIndex);
					sentenceStart = sentenceStart === -1 ? 0 : sentenceStart + 1;
					
					let sentenceEnd = text.indexOf('.', hyphenIndex);
					sentenceEnd = sentenceEnd === -1 ? text.length : sentenceEnd + 1;
					
					const sentence = text.slice(sentenceStart, sentenceEnd).trim();
					this.sentences.set(word, new Set([sentence]));
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
