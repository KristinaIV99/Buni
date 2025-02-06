class AhoCorasick {
    constructor() {
        this.root = this.createNode();
        this.ready = false;
        this.patternCount = 0;
        this.wordBoundaryRegex = /[\s.,!?;:'"„"\(\)\[\]{}<>\/\-—–]/;
        this.patterns = new Map(); // Saugome visus šablonus
    }

    createNode() {
        return {
            next: new Map(),
            fail: null,
            outputs: [],
            relatedPatterns: new Set(),
            isEnd: false,
            pattern: null,
            depth: 0
        };
    }

    addPattern(pattern, data) {
		console.log(`[AhoCorasick] Pridedamas šablonas:`, pattern, data);
		
		if (this.ready) {
			throw new Error('Negalima pridėti šablonų po buildFailureLinks()');
		}

		// Suvienodiname duomenų struktūrą
		const normalizedData = {
			type: data.type,
			"kalbos dalis": data["kalbos dalis"],
			"vertimas": data.vertimas,
			"bazinė forma": data["bazinė forma"],
			"bazė vertimas": data["bazė vertimas"],
			"CERF": data.CERF,
			"base_word": data.base_word || data["bazinė forma"], // Jei nėra base_word, naudojame bazinę formą
			"related": []
		};

		let node = this.root;
		const normalizedPattern = pattern.toLowerCase().trim();
		
		// Saugome šabloną į bendrą sąrašą
		this.patterns.set(normalizedPattern, {
			pattern: normalizedPattern,
			data: normalizedData,
			type: data.type,
			length: normalizedPattern.length
		});

		// Kuriame medį
		for (let i = 0; i < normalizedPattern.length; i++) {
			const char = normalizedPattern[i];
			
			if (!node.next.has(char)) {
				const newNode = this.createNode();
				newNode.depth = i + 1;
				node.next.set(char, newNode);
			}
			
			node = node.next.get(char);
		}

		// Pažymime galutinį mazgą
		node.isEnd = true;
		node.pattern = normalizedPattern;
		node.outputs.push({
			pattern: normalizedPattern,
			...normalizedData,
			length: normalizedPattern.length
		});
		
		this.patternCount++;
		console.log(`[AhoCorasick] Šablonas pridėtas, iš viso:`, this.patternCount);
	}

    buildFailureLinks() {
        console.log('[AhoCorasick] Kuriami failure links');
        
        const queue = [];
        
        // Nustatome pirmo lygio mazgų failure links į root
        for (const [char, node] of this.root.next) {
            node.fail = this.root;
            queue.push(node);
        }

        // BFS likusiems mazgams
        while (queue.length > 0) {
            const current = queue.shift();

            for (const [char, child] of current.next) {
                queue.push(child);

                let failNode = current.fail;
                
                while (failNode && !failNode.next.has(char)) {
                    failNode = failNode.fail;
                }

                child.fail = failNode ? failNode.next.get(char) : this.root;

                // Perkeliame outputs iš failure node
                if (child.fail.outputs.length > 0) {
                    child.outputs = [...child.outputs, ...child.fail.outputs];
                }
                
                // Perkeliame susijusius šablonus
                child.fail.relatedPatterns.forEach(pattern => {
                    child.relatedPatterns.add(pattern);
                });
            }
        }

        this.ready = true;
        console.log('[AhoCorasick] Failure links sukurti');
    }

    search(text) {
		console.log('[AhoCorasick] Pradedama paieška tekste');
		
		const matches = [];
		const allText = text.toLowerCase();
		
		// Pirma ieškome frazių (ilgiausios pirma)
		const phrases = Array.from(this.patterns.entries())
			.filter(([_, data]) => data.type === 'phrase')
			.sort((a, b) => b[0].length - a[0].length); // Rūšiuojame pagal ilgį
		
		console.log('Ieškome frazių:', phrases.map(p => p[0]));
		
		for (const [phrase, data] of phrases) {
			let index = 0;
			while ((index = allText.indexOf(phrase, index)) !== -1) {
				// Tikriname žodžių ribas
				if (this._isFullWord(text, index, index + phrase.length)) {
					matches.push({
						pattern: phrase,
						start: index,
						end: index + phrase.length,
						text: text.slice(index, index + phrase.length),
						outputs: [data.data],
						type: 'phrase'
					});
					console.log(`Rasta frazė "${phrase}" pozicijoje ${index}`);
				}
				index += 1;
			}
		}
		
		// Tada ieškome žodžių
		const words = this._splitIntoWords(text);
		for (const { word, start } of words) {
			let currentNode = this.root;
			const lowerWord = word.toLowerCase();

			for (let i = 0; i < lowerWord.length; i++) {
				const char = lowerWord[i];
				while (currentNode !== this.root && !currentNode.next.has(char)) {
					currentNode = currentNode.fail;
				}
				currentNode = currentNode.next.get(char) || this.root;

				if (currentNode.outputs.length > 0) {
					this._addMatches(currentNode, word, start, i, matches);
				}
			}
		}

		return this._filterOverlappingMatches(matches);
	}

	_addMatches(currentNode, word, startPosition, currentPosition, matches) {
		console.log(`[AhoCorasick] Tikrinami atitimenys nodelyje:`, {
			word,
			startPos: startPosition,
			currentPos: currentPosition
		});

		for (const output of currentNode.outputs) {
			const pattern = output.pattern;
			const patternStart = currentPosition - pattern.length + 1;
			
			if (patternStart >= 0) {
				const matchText = word.toLowerCase().slice(patternStart, currentPosition + 1);
				
				if (matchText === pattern && 
					this._isFullWord(word, patternStart, currentPosition + 1)) {
						
					console.log(`[AhoCorasick] Rastas atitikmuo:`, {
						pattern,
						text: word.slice(patternStart, currentPosition + 1)
					});
					
					matches.push({
						pattern: pattern,
						start: startPosition + patternStart,
						end: startPosition + currentPosition + 1,
						text: word.slice(patternStart, currentPosition + 1),
						outputs: [output],
						related: Array.from(currentNode.relatedPatterns)
					});
				}
			}
		}
	}

    _findMatchesInWord(word, startPosition, fullText) {
        const matches = [];
        let node = this.root;
        const lowerWord = word.toLowerCase();

        for (let i = 0; i < lowerWord.length; i++) {
            const char = lowerWord[i];
            
            while (node !== this.root && !node.next.has(char)) {
                node = node.fail;
            }
            
            node = node.next.get(char) || this.root;

            if (node.isEnd) {
                const currentPattern = node.pattern;
                const patternLength = currentPattern.length;
                const wordStart = i - patternLength + 1;
                
                if (wordStart >= 0) {
                    const matchedText = lowerWord.slice(wordStart, i + 1);
                    
                    if (matchedText === currentPattern) {
                        const absoluteStart = startPosition + wordStart;
                        const absoluteEnd = startPosition + i + 1;
                        
                        if (this._isFullWord(fullText, absoluteStart, absoluteEnd)) {
                            const match = {
                                pattern: currentPattern,
                                start: absoluteStart,
                                end: absoluteEnd,
                                text: word.slice(wordStart, i + 1),
                                outputs: node.outputs,
                                related: Array.from(node.relatedPatterns)
                            };
                            matches.push(match);
                        }
                    }
                }
            }
        }

        return matches;
    }

	_filterOverlappingMatches(matches) {
		console.log('[AhoCorasick] Filtruojami persidengiantys atitimenys:', matches);

		// Rūšiuojame pagal pradžios poziciją ir ilgį
		const sortedMatches = matches.sort((a, b) => {
			if (a.start === b.start) {
				return b.pattern.length - a.pattern.length; // Ilgesni turi prioritetą
			}
			return a.start - b.start;
		});

		const filtered = [];
		const usedPositions = new Map(); // Naudojame Map vietoj Set

		for (const match of sortedMatches) {
			const currentRange = `${match.start}-${match.end}`;
			
			// Tikriname ar ši pozicija neužimta ilgesniu atitikmeniu
			const isPositionFree = !Array.from(usedPositions.keys()).some(range => {
				const [usedStart, usedEnd] = range.split('-').map(Number);
				return !(match.end <= usedStart || match.start >= usedEnd);
			});

			if (isPositionFree) {
				filtered.push({
					pattern: match.pattern,
					start: match.start,
					end: match.end,
					text: match.text,
					outputs: match.outputs,
					type: match.outputs[0].type,
					related: []
				});
				
				usedPositions.set(currentRange, match.pattern);
			} else {
				// Pridedame kaip susijusį šabloną
				const overlappingMatch = filtered.find(f => 
					f.start <= match.start && f.end >= match.end);
				if (overlappingMatch) {
					overlappingMatch.related.push({
						pattern: match.pattern,
						type: match.outputs[0].type
					});
				}
			}
		}

		console.log('[AhoCorasick] Filtravimo rezultatas:', filtered);
		return filtered;
	}

    _splitIntoWords(text) {
        const words = [];
        let currentWord = '';
        let wordStart = 0;

        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            if (this.wordBoundaryRegex.test(char)) {
                if (currentWord.length > 0) {
                    words.push({
                        word: currentWord,
                        start: wordStart
                    });
                    currentWord = '';
                }
                wordStart = i + 1;
            } else {
                if (currentWord.length === 0) {
                    wordStart = i;
                }
                currentWord += char;
            }
        }

        if (currentWord.length > 0) {
            words.push({
                word: currentWord,
                start: wordStart
            });
        }

        return words;
    }

    _isFullWord(text, start, end) {
        const prevChar = start > 0 ? text[start - 1] : ' ';
        const nextChar = end < text.length ? text[end] : ' ';
        return this.wordBoundaryRegex.test(prevChar) && 
               this.wordBoundaryRegex.test(nextChar);
    }

    getStats() {
        return {
            patternCount: this.patternCount,
            isReady: this.ready,
            patterns: Array.from(this.patterns.keys())
        };
    }

    clear() {
        console.log('[AhoCorasick] Valomas medis');
        this.root = this.createNode();
        this.ready = false;
        this.patternCount = 0;
        this.patterns.clear();
    }
}

export { AhoCorasick };
