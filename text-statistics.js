const DEBUG = true;  // arba false true kai norėsime išjungti

export class TextStatistics {
    constructor() {
        this.CLASS_NAME = '[TextStatistics]';
        this.currentText = '';
		this.allWordsList = [];        // Visi žodžiai (su pasikartojimais)
        this.removedWordsList = [];    // Pašalinti žodžiai
    }

    debugLog(...args) {
        if (DEBUG) {
            console.log(`${this.CLASS_NAME} [DEBUG]`, ...args);
        }
    }

    calculateStats(text, knownWords) {
        this.currentText = text;
		this.allWordsList = [];      // Išvalome prieš naują skaičiavimą
        this.removedWordsList = [];  // Išvalome prieš naują skaičiavimą

        // Naudojame getUnknownWords metodą, kad išvengtume kodo dubliavimo
        const unknownWordsList = this.getUnknownWords(text, knownWords);
        const words = this._getWords(text);
        this.allWordsList = words;   // Išsaugome visus žodžius

        const self = this;  // Išsaugome this kontekstą
        
		// Sukuriame Map žodžių originalių formų saugojimui
		const wordMap = new Map();
		
        const uniqueWords = new Set(words.map(function(word) {
			var lowerWord = word.toLowerCase();

			// Pridedame debug pranešimą
			self.debugLog('Apdorojamas žodis:', word);
			
			// Jei žodis turi brūkšnelį arba dvitaškį ir atitinka kriterijus, palikti jį nepakeistą
			if (!self._shouldKeepAsOneWord(lowerWord)) {
				lowerWord = lowerWord
					.replace(/[.,!?;#]/g, '')
					.replace(/[''""'\u201C\u201D\u2018\u2019"]/gu, function(match) {
						return /['']/.test(match) ? match : '';
					})
					.trim();
				self.debugLog('Po valymo:', lowerWord);
			} else {
				self.debugLog('Išsaugotas kaip vienas žodis:', lowerWord);
			}

			// Saugome originalias formas
			if (!wordMap.has(lowerWord)) {
				wordMap.set(lowerWord, new Set());
			}
			wordMap.get(lowerWord).add(word);

			return lowerWord;
		}).filter(word => word.length > 0));

		// Filtruojame tikrinius daiktavardžius
		uniqueWords.forEach(word => {
			if (this._isProperNoun(wordMap.get(word))) {
				uniqueWords.delete(word);
				this.removedWordsList.push(word); // Įtraukiame į pašalintų sąrašą
				self.debugLog('Pašalintas tikrinis daiktavardis:', word);
			}
		});

		// Išvedame visas suvestines
        this.debugLog('=== ŽODŽIŲ SUVESTINĖ ===');
        this.debugLog('Visi žodžiai:', this.allWordsList);
        this.debugLog('Pašalinti žodžiai:', this.removedWordsList);
        this.debugLog('Visi unikalūs žodžiai:', Array.from(uniqueWords));

        const stats = {
            totalWords: words.length,
            uniqueWords: uniqueWords.size,
            unknownWords: unknownWordsList.length,
            unknownPercentage: ((unknownWordsList.length / uniqueWords.size) * 100).toFixed(2)
        };

        this.debugLog('Statistika:', stats);
        return stats;
    }
    
	_shouldKeepAsOneWord(word) {
			// Tikrina ar žodis turi brūkšnelį arba dvitaškį tarp raidžių
			return /^[a-zåäöA-ZÅÄÖ]+[-:][a-zåäöA-ZÅÄÖ]+$/.test(word);
	}

    _getWords(text) {
        this.debugLog('Išskiriami žodžiai iš teksto');
        const normalizedText = text.normalize('NFC');
        const cleanText = normalizedText
            .replace(/§SECTION_BREAK§/g, ' ')
            .replace(/<[^>]+>/g, ' ')
            .replace(/[0-9]+(?:_+)?/g, ' ')
            .replace(/\s-\s/g, ' ')
            .replace(/\s:\s/g, ' ')
            .replace(/[_#\[\](){}.,!?;""'\u201C\u201D\u2018\u2019"]/g, function(match) {
                if (/[''\u2019]/.test(match)) {
                    return match;
                }
                return ' ';
            })
            .replace(/___\w+/g, ' ')
            .replace(/_\w+/g, ' ')
            .replace(/\s+/g, ' ')
            .replace(/[0-9]-\w+/g, ' ')
            .replace(/[•…"""]/g, ' ')
            .replace(/^"+|"+$/g, '')
            .replace(/"+/g, ' ')
            .replace(/[%‰]/g, '')
            .trim();

        const words = cleanText.split(' ')
            .filter(word => {
				// Jei žodis turi brūkšnelį arba dvitaškį, tikriname ar jis atitinka mūsų kriterijus
				if (word.includes('-') || word.includes(':')) {
					return this._shouldKeepAsOneWord(word);
				}
				return word.length > 0 && /\p{L}/u.test(word);
			})
			.map(word => word.trim());
		
		this.debugLog('Rasta žodžių:', words.length);
		return words;
    }

    _isWordInDictionary(word, knownWords) {
        const cleanWord = word.toLowerCase()
            .replace(/[""'\u201C\u201D\u2018\u2019"]/gu, '')
            .trim();
        const wordVariants = [
            cleanWord,
            word.toLowerCase().replace(/[""'\u201C\u201D\u2018\u2019"]/gu, ''),
            word.toLowerCase()
        ];
        
        const isKnown = Object.keys(knownWords).some(dictWord => {
            const baseWord = dictWord.split('_')[0]
                .toLowerCase()
                .replace(/[""'\u201C\u201D\u2018\u2019"]/gu, '')
                .trim();
            return wordVariants.some(variant => {
                const cleanVariant = variant
                    .replace(/[""'\u201C\u201D\u2018\u2019"]/gu, '')
                    .trim();
                
                return baseWord === cleanVariant;
            });
        });

        this.debugLog('Žodžio patikrinimas žodyne:', { žodis: word, rastas: isKnown });
        return isKnown;
    }
    
    _isProperNoun(originalForms) {
		return Array.from(originalForms).some(form => {
			try {
				// Išsamesnė informacija apie pradines sąlygas
				this.debugLog('Analizuojamas žodis:', form);
				this.debugLog('Visas tekstas:', this.currentText);

				// Tikriname ar prasideda didžiąja raide
				const startsWithUpper = /^[A-ZÅÄÖ]/.test(form);
				this.debugLog('Prasideda didžiąja raide:', startsWithUpper);
				
				if (!startsWithUpper) {
					return false;
				}

				// Tikriname žodį mažosiomis
				const lowerCaseForm = form.toLowerCase();
				const lowerCaseRegex = new RegExp(`\\b${lowerCaseForm}\\b`);
				const appearsLowerCase = lowerCaseRegex.test(this.currentText);
				this.debugLog('Žodžio mažosiomis regex:', lowerCaseRegex);
				this.debugLog('Rasti atitikimai mažosiomis:', this.currentText.match(lowerCaseRegex));
				
				if (appearsLowerCase) {
					this.debugLog('Žodis rastas mažosiomis raidėmis');
					return false;
				}

				// Tikriname žodį sakinio viduryje
				const middleRegex = new RegExp(`[.!?\\n]\\s+\\w+\\s+${form}\\b`);
				const appearsInMiddle = middleRegex.test(this.currentText);
				this.debugLog('Sakinio vidurio regex:', middleRegex);
				this.debugLog('Rasti atitikimai viduryje:', this.currentText.match(middleRegex));

				// Skaičiuojame pasikartojimus su didžiąja
				const upperCaseRegex = new RegExp(`\\b${form}\\b`, 'g');
				const occurrencesWithUpperCase = (this.currentText.match(upperCaseRegex) || []).length;
				this.debugLog('Didžiųjų raidžių regex:', upperCaseRegex);
				this.debugLog('Rasti atitikimai su didžiąja:', this.currentText.match(upperCaseRegex));

				// Tikriname ar pirmas sakinyje
				const firstInSentenceRegex = new RegExp(`(^|[.!?\\n]\\s+)${form}\\b`);
				const isFirstInSentence = firstInSentenceRegex.test(this.currentText);
				this.debugLog('Pirmo sakinyje regex:', firstInSentenceRegex);
				this.debugLog('Rasti pirmo sakinyje atitikimai:', this.currentText.match(firstInSentenceRegex));

				// Detali analizės suvestinė
				this.debugLog('Žodžio analizės rezultatai:', {
					žodis: form,
					yraPirmas: isFirstInSentence,
					yraViduryje: appearsInMiddle,
					yraMažosiomis: appearsLowerCase,
					pasikartojimaiSuDidžiąja: occurrencesWithUpperCase,
					sakinioVidurio_regex: middleRegex.toString(),
					mažųjų_raidžių_regex: lowerCaseRegex.toString(),
					pirmo_sakinyje_regex: firstInSentenceRegex.toString()
				});

			return !appearsLowerCase && appearsInMiddle;
			} catch (error) {
				this.debugLog('Klaida apdorojant žodį:', form, error);
				return false;
			}
		});
	}
    
    getUnknownWords(text, knownWords) {
        this.currentText = text;
        this.debugLog('Pradedu nežinomų žodžių paiešką');
        const words = this._getWords(text);
        
        // Saugome originalius žodžius ir jų mažąsias versijas žodyno paieškai
        const wordMap = new Map();
        words.forEach(word => {
			let lowerWord = word.toLowerCase();
			
			// Jei žodis turi brūkšnelį arba dvitaškį ir atitinka kriterijus, palikti jį nepakeistą
			if (!this._shouldKeepAsOneWord(lowerWord)) {
				lowerWord = lowerWord
					.replace(/[.,!?;#]/g, '')
					.replace(/[''""'\u201C\u201D\u2018\u2019"]/gu, match => /['']/.test(match) ? match : '')
					.trim();
			}
            
            if (lowerWord.length > 0) {
                if (!wordMap.has(lowerWord)) {
                    wordMap.set(lowerWord, new Set());
                }
                wordMap.get(lowerWord).add(word);
            }
        });

        this.debugLog('Unikalių žodžių Map:', wordMap);
        
        const unknownWords = [];
        for (const [lowerWord, originalForms] of wordMap) {
            this.debugLog('Tikrinu žodį:', lowerWord, 'Originalios formos:', originalForms);

            if (this._isWordInDictionary(lowerWord, knownWords)) {
                this.debugLog('Žodis rastas žodyne:', lowerWord);
                continue;
            }

            // Tikriname ar žodis yra tikrinis
            if (this._isProperNoun(originalForms)) {
                this.debugLog('Žodis yra tikrinis (visada didžiąja):', lowerWord, originalForms);
                continue;
            }

            this.debugLog('Žodis nežinomas ir ne tikrinis:', lowerWord);
            unknownWords.push(lowerWord);
        }

        this.debugLog('Nežinomų žodžių kiekis:', unknownWords.length);
        this.debugLog('Pirmi 10 nežinomų žodžių:', unknownWords.slice(0, 10));
        
        return unknownWords;
    }
}
