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
		console.log("Turimas HTML turinys:", document.querySelector('.text-content').innerHTML.slice(0, 500));
		console.log("Rastų paragrafų skaičius:", document.querySelector('.text-content').getElementsByTagName('p').length);

		// Gauname HTML elementą
		const contentDiv = document.querySelector('.text-content');
		const paragraphs = contentDiv.getElementsByTagName('p');

		// Einame per kiekvieną nežinomą žodį iš statistikos
		unknownWords.forEach(word => {
			Array.from(paragraphs).forEach(p => {
				const paragraphText = p.textContent;
				
				// Ar yra žodis šiame paragrafe?
				if (paragraphText.toLowerCase().includes(word.toLowerCase())) {
					// Randame sakinio pradžią
					let sentenceStart = paragraphText.lastIndexOf('.', 
						paragraphText.toLowerCase().indexOf(word.toLowerCase()));
					sentenceStart = sentenceStart === -1 ? 0 : sentenceStart + 1;

					// Randame sakinio pabaigą
					let sentenceEnd = paragraphText.indexOf('.', 
						paragraphText.toLowerCase().indexOf(word.toLowerCase()) + word.length);
					sentenceEnd = sentenceEnd === -1 ? paragraphText.length : sentenceEnd + 1;

					// Ištraukiame sakinį
					const sentence = paragraphText.slice(sentenceStart, sentenceEnd).trim();
					
					// Jei radome tinkamą sakinį, išsaugome
					if (sentence.toLowerCase().includes(word.toLowerCase())) {
						this.sentences.set(word, new Set([sentence]));
					}
				}
			});
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
