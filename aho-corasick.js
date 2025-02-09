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

		// Surenkame visas reikšmes iš data objekto
		const meanings = [];
		for (let i = 0; data[i]; i++) {
			meanings.push({
				type: data.type,
				"kalbos dalis": data[i]["kalbos dalis"],
				"vertimas": data[i].vertimas,
				"bazinė forma": data[i]["bazinė forma"],
				"bazė vertimas": data[i]["bazė vertimas"],
				"CERF": data[i].CERF
			});
		}

		let node = this.root;
		const normalizedPattern = pattern.toLowerCase().trim();
		
		// Saugome šabloną į bendrą sąrašą
		this.patterns.set(normalizedPattern, {
			pattern: normalizedPattern,
			data: {
				type: data.type,
				meanings: meanings
			},
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
		node.outputs = meanings;
		
		this.patternCount++;
		console.log(`[AhoCorasick] Šablonas pridėtas su reikšmėmis:`, meanings);
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
		console.log('\n=== PRADEDAMA PAIEŠKA ===');
		console.log('Teksto ilgis:', text.length);

		const matches = [];
		const allText = text.toLowerCase();
		
		// Surūšiuojame visus šablonus pagal ilgį (ilgiausi pirma)
		const allPatterns = Array.from(this.patterns.entries())
			.sort((a, b) => b[0].length - a[0].length);
			
		console.log('\nŠABLONŲ PRADŽIA:');
		allPatterns.forEach(([pattern, data], index) => {
			console.log(`${index + 1}. "${pattern}" (${data.data.type}) - ilgis: ${pattern.length}`);
		});

		// Ieškome visų šablonų (ir frazių, ir žodžių)
		for (const [pattern, data] of allPatterns) {
			let index = 0;
			let patternMatches = 0;
			
			console.log(`\nIeškoma: "${pattern}" (${data.data.type})`);
			
			while ((index = allText.indexOf(pattern, index)) !== -1) {
				const context = allText.slice(Math.max(0, index - 20), 
					Math.min(allText.length, index + pattern.length + 20));
				console.log(`Rastas "${pattern}" pozicijoje ${index}`);
				console.log(`Kontekstas: "...${context}..."`);
				
				// Patikriname ar tai pilnas žodis/frazė
				const isValid = this._isFullWord(text, index, index + pattern.length);
				console.log(`Ar tinkamas? ${isValid}`);

				if (isValid) {
					patternMatches++;
					matches.push({
						pattern: pattern,
						start: index,
						end: index + pattern.length,
						text: text.slice(index, index + pattern.length),
						outputs: data.data.meanings,
						type: data.data.type
					});

					console.log('Pridėtas match su duomenimis:', {
						pattern: pattern,
						outputs: data.data
					});
				}
				index += 1;
			}
			console.log(`Rasta atitikmenų "${pattern}": ${patternMatches}`);
		}

		console.log('\n=== PAIEŠKA BAIGTA ===');
		console.log('Viso rasta atitikmenų:', matches.length);
		
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
		console.log('[AhoCorasick] Pradedamas persidengimų filtravimas');
    
		// Pirmiausia rūšiuojame pagal tipą (frazės turi prioritetą), tada pagal ilgį
		const sortedMatches = matches.sort((a, b) => {
			// Jei vienas yra frazė, o kitas žodis - frazė turi prioritetą
			if (a.type === 'phrase' && b.type !== 'phrase') return -1;
			if (a.type !== 'phrase' && b.type === 'phrase') return 1;
			
			// Jei abu yra frazės arba abu žodžiai - ilgesnis turi prioritetą
			if (a.start === b.start) {
				return b.pattern.length - a.pattern.length;
			}
			return a.start - b.start;
		});

		console.log('Surūšiuoti atitimenys:', sortedMatches);

		const filtered = [];
		const usedRanges = [];

		for (const match of sortedMatches) {
			let hasOverlap = false;
        
			// Tikriname ar nepersidengia su jau pridėtais
			for (const range of usedRanges) {
				if (!(match.end <= range.start || match.start >= range.end)) {
					hasOverlap = true;
					break;
				}
			}

			if (!hasOverlap) {
				filtered.push(match);
				usedRanges.push({
					start: match.start,
					end: match.end,
					pattern: match.pattern
				});
				console.log(`Pridėtas ${match.type}: "${match.pattern}"`);
			} else {
				console.log(`Praleista dėl persidengimo: "${match.pattern}"`);
			}
		}

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
		// Debug informacija
		const context = {
			before: text.slice(Math.max(0, start - 10), start),
			word: text.slice(start, end),
			after: text.slice(end, Math.min(text.length, end + 10))
		};
		console.log('Tikriname kontekstą:', context);

		// Tikriname prieš
		let isValidStart = true;
		if (start > 0) {
			const beforeChar = text[start - 1];
			// Leidžiame tik jei prieš yra tarpas, naujos eilutės simbolis arba _
			isValidStart = beforeChar === ' ' || beforeChar === '\n' || beforeChar === '_';
		}

		// Tikriname po
		let isValidEnd = true;
		if (end < text.length) {
			const afterChar = text[end];
			// Leidžiame tik jei po yra tarpas, naujos eilutės simbolis, skyrybos ženklas arba _
			isValidEnd = afterChar === ' ' || afterChar === '\n' || 
						afterChar === '_' || afterChar === '.' || 
						afterChar === ',' || afterChar === '-' ||
						afterChar === '!' || afterChar === '?';
		}

		console.log('Validacija:', {
			start: isValidStart,
			end: isValidEnd,
			result: isValidStart && isValidEnd
		});

		return isValidStart && isValidEnd;
	}
}

export { AhoCorasick };
