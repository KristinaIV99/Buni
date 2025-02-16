const DEBUG = true; // arba false kai norėsime išjungti

export class UnknownWordsExporter {
    constructor() {
        this.APP_NAME = '[UnknownWordsExporter]';
        this.sentences = new Map();
    }

    debugLog(...args) {
        if (DEBUG) {
            console.log(`${this.APP_NAME} [DEBUG]`, ...args);
        }
    }

    cleanSentence(sentence) {
        return sentence
            .replace(/^["']|["']$/g, '')
            .replace(/[#*_\[\]•]/g, '')
			.replace(/[#*_\[\]•§]/g, '')  // Pridėjome §
			.replace(/SECTIONBREAK/g, '')  // Pridėjome SECTIONBREAK
			.replace(/^-\s*/g, '')  // Pridėta: pašalina brūkšnelį ir tarpus pradžioje
            .replace(/\s+/g, ' ')
            .trim();
			this.debugLog('Po valymo:', cleaned);
			return cleaned;
    }

    processText(text, unknownWords) {
		// Pirma išvalome visą tekstą
		text = text.replace(/§SECTIONBREAK§/g, '');
		this.debugLog('Pradinis tekstas po valymo (pirmi 200 simboliai):', text.substring(0, 200));

		console.log(`${this.APP_NAME} Pradedu teksto apdorojimą`);
		console.log(`Viso nežinomų žodžių: ${unknownWords.length}`);
		
		const wordsWithoutContext = [];
		
		unknownWords.forEach(word => {
			this.debugLog('Pradedama žodžio paieška:', word);
			
			// Randame žodžio poziciją
			let currentIndex = 0;
			let bestSentence = null;
			let shortestLength = Infinity;
			
			// Ieškome visų sakinio variantų su šiuo žodžiu
			while ((currentIndex = text.toLowerCase().indexOf(word.toLowerCase(), currentIndex)) !== -1) {
				// Patikriname, ar tai tikrai atskiras žodis
				const beforeChar = currentIndex === 0 ? ' ' : text[currentIndex - 1];
				const afterChar = currentIndex + word.length >= text.length ? ' ' : text[currentIndex + word.length];
				
				if (!/[a-zåäö]/i.test(beforeChar) && !/[a-zåäö]/i.test(afterChar)) {
					this.debugLog('Rastas žodis pozicijoje:', currentIndex);
					this.debugLog('Tekstas aplink žodį:', text.slice(Math.max(0, currentIndex - 30), currentIndex + 30));
					
					let sentenceStart = 0;
					let searchPos = currentIndex;
					
					// Einame atgal per tekstą ieškodami tikros sakinio pradžios
					while (searchPos > 0) {
						const char = text[searchPos - 1];
						if (char === '.' || char === '?' || char === '!') {
							this.debugLog('Rastas skiriamasis ženklas:', char, 'pozicijoje:', searchPos - 1);
							
							// Tikriname, ar po skiriamojo ženklo eina mažoji raidė
							if (searchPos + 2 < text.length && text[searchPos] === ' ' && /[a-zåäö]/.test(text[searchPos + 1])) {
								this.debugLog('Po skiriamojo ženklo rasta mažoji raidė:', text[searchPos + 1]);
								// Jei mažoji - tęsiame paiešką atgal
								searchPos--;
								continue;
							}
							// Jei ne mažoji - radome sakinio pradžią
							sentenceStart = searchPos;
							this.debugLog('Rasta sakinio pradžia pozicijoje:', sentenceStart);
							break;
						}
						searchPos--;
					}

					// Ieškome sakinio pabaigos
					let sentenceEnd = currentIndex;
					while (sentenceEnd < text.length) {
						if (text[sentenceEnd] === '.' || text[sentenceEnd] === '?' || text[sentenceEnd] === '!') {
							// Tikriname, ar po skiriamojo ženklo eina tarpas ir mažoji raidė
							if (sentenceEnd + 2 < text.length && text[sentenceEnd + 1] === ' ' && /[a-zåäö]/.test(text[sentenceEnd + 2])) {
								this.debugLog('Po skiriamojo ženklo teksto pabaigoje rasta mažoji raidė:', text[sentenceEnd + 2]);
								sentenceEnd++;
								continue;
							}
							sentenceEnd++;
							break;
						}
						sentenceEnd++;
					}
					
					this.debugLog('Nustatyta sakinio pradžia ir pabaiga:', {pradžia: sentenceStart, pabaiga: sentenceEnd});

					// Išskiriame sakinį
					const sentence = text.slice(sentenceStart, sentenceEnd).trim();
					this.debugLog('Išskirtas sakinys:', sentence);
					
					// Tikriname ar šis sakinys geresnis
					const wordCount = sentence.split(' ').length;
					this.debugLog('Žodžių skaičius sakinyje:', wordCount);

					if (wordCount <= 15) {
						this.debugLog('Rastas tinkamo ilgio sakinys (<=15 žodžių)');
						bestSentence = sentence;
						break; // Radome trumpą sakinį, galime baigti paiešką
					} else if (wordCount < shortestLength) {
						this.debugLog('Rastas trumpesnis sakinys nei ankstesnis');
						shortestLength = wordCount;
						bestSentence = sentence;
					}
					
					currentIndex = sentenceEnd;
				} else {
					this.debugLog('Rastas panašus žodis, bet ne tikslus atitikmuo');
					currentIndex = currentIndex + 1;
				}
			}

			if (bestSentence) {
				this.debugLog('Išsaugomas sakinys žodžiui:', word, ':', bestSentence);
				this.sentences.set(word, new Set([bestSentence]));
			} else {
				this.debugLog('Bandoma ieškoti su brūkšneliu žodžiui:', word);
				// Bandome su brūkšneliu
				currentIndex = text.toLowerCase().indexOf(`-${word.toLowerCase()}`);
				if (currentIndex !== -1) {
					let sentenceStart = text.lastIndexOf('.', currentIndex);
					sentenceStart = sentenceStart === -1 ? 0 : sentenceStart + 1;
					
					let sentenceEnd = text.indexOf('.', currentIndex);
					sentenceEnd = sentenceEnd === -1 ? text.length : sentenceEnd + 1;
					
					bestSentence = text.slice(sentenceStart, sentenceEnd).trim();
					this.debugLog('Rastas sakinys su brūkšneliu:', bestSentence);
					this.sentences.set(word, new Set([bestSentence]));
				} else {
					this.debugLog('Žodis nerastas jokiame kontekste:', word);
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
