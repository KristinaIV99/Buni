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
		
		// Funkcija sakinio tinkamumui patikrinti - ją keliame į metodo pradžią
		const isSentenceValid = (sentence, word) => {
			// Būtinos sąlygos
			if (!sentence || !word) return false;
			
			// Sakinys turi turėti bent minimalų kontekstą
			const minLength = word.length + 5;
			if (sentence.length < minLength) return false;
			
			// Sakinys turėtų turėti tašką gale (bet gali būti ir ! arba ?)
			if (!/[.!?]$/.test(sentence)) return false;
			
			// Jei tai dialogas (prasideda brūkšniu), tai yra geras kontekstas
			if (sentence.startsWith('–') || sentence.startsWith('-')) {
				return true;
			}
			
			// Kiti sakiniai turi turėti daugiau konteksto
			return sentence.split(' ').length >= 3;
		};

		// Sukuriame laikinį DOM elementą HTML analizei
		const tempDiv = document.createElement('div');
		tempDiv.innerHTML = text;
		
		const paragraphs = tempDiv.getElementsByTagName('p');
		
		unknownWords.forEach(word => {
			const wordPattern = new RegExp(word, 'i');
			let bestSentence = null;

			// Ieškome per visus paragrafus
			Array.from(paragraphs).forEach(p => {
				const paragraphText = p.textContent;
				
				// Randame sakinio pradžią ir pabaigą
				const wordIndex = paragraphText.toLowerCase().indexOf(word.toLowerCase());
				if (wordIndex === -1) return;

				// Randame sakinio pradžią
				let sentenceStart = paragraphText.lastIndexOf('.', wordIndex);
				sentenceStart = sentenceStart === -1 ? 0 : sentenceStart + 1;

				// Randame sakinio pabaigą
				let sentenceEnd = paragraphText.indexOf('.', wordIndex + word.length);
				sentenceEnd = sentenceEnd === -1 ? paragraphText.length : sentenceEnd + 1;

				// Ištraukiame sakinį
				const sentence = paragraphText.slice(sentenceStart, sentenceEnd).trim();
				
				// Tikriname sakinio tinkamumą naudodami mūsų validacijos funkciją
				if (isSentenceValid(sentence, word)) {
					bestSentence = sentence;
					return; // Radome tinkamą sakinį, nutraukiame paiešką
				}
			});

			if (bestSentence) {
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
