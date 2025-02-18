const DEBUG = true;  // arba false true kai norėsime išjungti

export class TextStatistics {
    constructor() {
        this.CLASS_NAME = '[TextStatistics]';
    }

    debugLog(...args) {
        if (DEBUG) {
            console.log(`${this.CLASS_NAME} [DEBUG]`, ...args);
        }
    }

    calculateStats(text, knownWords) {
        // Naudojame getUnknownWords metodą, kad išvengtume kodo dubliavimo
        const unknownWordsList = this.getUnknownWords(text, knownWords);
        const words = this._getWords(text);
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
				self.debugLog('Pašalintas tikrinis daiktavardis:', word);
			}
		});

		// Čia galime įdėti debug pranešimą apie visus unikalius žodžius
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
        const hasLowerCase = Array.from(originalForms).some(form => /^[a-zåäö]/.test(form));
        const hasUpperCase = Array.from(originalForms).some(form => /^[A-ZÅÄÖ]/.test(form));

        return hasUpperCase && !hasLowerCase;
    }
    
    getUnknownWords(text, knownWords) {
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
