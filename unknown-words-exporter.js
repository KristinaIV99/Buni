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
		console.log("Pirmi 5 nežinomi žodžiai:", unknownWords.slice(0, 5)); // DEBUG
		
		// Funkcija sakinio tinkamumui patikrinti - ją keliame į metodo pradžią
		const isSentenceValid = (sentence, word) => {
			// Būtinos sąlygos
			if (!sentence || !word) {
				console.log("Tuščias sakinys arba žodis:", {sentence, word}); // DEBUG
				return false;
			}
			
			// Sakinys turi turėti bent minimalų kontekstą
			const minLength = word.length + 5;
			if (sentence.length < minLength) {
				console.log("Per trumpas sakinys:", sentence); // DEBUG
				return false;
			}
			
			// Sakinys turėtų turėti tašką gale (bet gali būti ir ! arba ?)
			if (!/[.!?]$/.test(sentence)) {
				console.log("Sakinys be taško:", sentence); // DEBUG
				return false;
			}
			
			// Jei tai dialogas (prasideda brūkšniu), tai yra geras kontekstas
			if (!/[.!?]$/.test(sentence)) {
				console.log("Sakinys be taško:", sentence); // DEBUG
				return false;
			}
			
			// Kiti sakiniai turi turėti daugiau konteksto
			const wordCount = sentence.split(' ').length;
			console.log("Žodžių skaičius sakinyje:", wordCount); // DEBUG
			return wordCount >= 3;
		};

		const tempDiv = document.createElement('div');
		tempDiv.innerHTML = text;
		
		const paragraphs = tempDiv.getElementsByTagName('p');
		console.log("Rastų paragrafų skaičius:", paragraphs.length); // DEBUG
		
		// Patikriname pirmą paragrafą
		if (paragraphs.length > 0) {
			console.log("Pirmo paragrafo turinys:", paragraphs[0].textContent); // DEBUG
		}

		unknownWords.forEach(word => {
			const wordPattern = new RegExp(word, 'i');
			let bestSentence = null;

			// Ieškome per visus paragrafus
			Array.from(paragraphs).forEach(p => {
				const paragraphText = p.textContent;
				
				// Randame sakinio pradžią ir pabaigą
				const wordIndex = paragraphText.toLowerCase().indexOf(word.toLowerCase());
				if (wordIndex === -1) return;

				console.log("Rastas žodis:", word, "paragrafe:", paragraphText.slice(0, 100)); // DEBUG

				// Randame sakinio pradžią
				let sentenceStart = paragraphText.lastIndexOf('.', wordIndex);
				sentenceStart = sentenceStart === -1 ? 0 : sentenceStart + 1;

				// Randame sakinio pabaigą
				let sentenceEnd = paragraphText.indexOf('.', wordIndex + word.length);
				sentenceEnd = sentenceEnd === -1 ? paragraphText.length : sentenceEnd + 1;

				// Ištraukiame sakinį
				const sentence = paragraphText.slice(sentenceStart, sentenceEnd).trim();
				console.log("Ištrauktas sakinys:", sentence); // DEBUG
				
				// Tikriname sakinio tinkamumą naudodami mūsų validacijos funkciją
				if (isSentenceValid(sentence, word)) {
					bestSentence = sentence;
					console.log("Rastas tinkamas sakinys žodžiui:", word, "->", sentence); // DEBUG
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
