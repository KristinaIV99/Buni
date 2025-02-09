import { AhoCorasick } from './aho-corasick.js';

export class DictionaryManager {
    constructor() {
        this.MANAGER_NAME = '[DictionaryManager]';
        this.dictionaries = new Map();
        this.searcher = new AhoCorasick();
        this.statistics = {
            totalEntries: 0,
            loadedDictionaries: 0,
            searchStats: {
                totalSearches: 0,
                averageSearchTime: 0
            }
        };
    }

    async loadDictionary(file) {
        const startTime = performance.now();
        console.log(`${this.MANAGER_NAME} Pradedamas žodyno įkėlimas:`, file.name);
        
        try {
            const text = await this._readFileAsText(file);
            const dictionary = this._parseJSON(text);
            const type = file.name.includes('phrases') ? 'phrase' : 'word';
            let entryCount = 0;

            for (const [key, data] of Object.entries(dictionary)) {
                if (!this._validateDictionaryEntry(key, data)) continue;

                const baseWord = key.split('_')[0];
                const entry = {
                    ...data,
                    type,
                    source: file.name,
                    originalKey: key,
                    baseWord
                };

                try {
                    this.searcher.addPattern(baseWord, entry);
                    entryCount++;
                } catch (error) {
                    console.error(`Klaida pridedant šabloną ${key}:`, error);
                }
            }

            this.searcher.buildFailureLinks();
            
            this.statistics.totalEntries += entryCount;
            this.statistics.loadedDictionaries++;
            
            this.dictionaries.set(file.name, {
                name: file.name,
                type,
                entries: entryCount,
                timestamp: new Date()
            });

            const loadTime = performance.now() - startTime;
            console.log(`${this.MANAGER_NAME} Žodynas įkeltas per ${loadTime.toFixed(2)}ms`);
            
            return {
                name: file.name,
                type,
                entries: entryCount,
                loadTimeMs: loadTime
            };
            
        } catch (error) {
            console.error(`${this.MANAGER_NAME} Klaida įkeliant žodyną:`, error);
            throw new Error(`Klaida įkeliant žodyną ${file.name}: ${error.message}`);
        }
    }

    async findInText(text) {
        console.log(`${this.MANAGER_NAME} Pradedama teksto analizė, teksto ilgis:`, text.length);

		try {
			const matches = this.searcher.search(text);
			console.log('Pilni atitimenys:', matches);
        
			const results = matches.map(match => {
				const wordInfo = {
					...match.outputs[0],
					text: match.text,  // Pridedame rastą tekstą
					pattern: match.pattern // Pridedame šabloną
				};
				
				const info = this._extractWordInfo(wordInfo);
				console.log('Apdorotas info:', info);
				
				return {
					pattern: match.pattern,
					type: match.outputs[0].type,
					info: info,
					positions: [{
						start: match.start,
						end: match.end,
						text: match.text
					}],
					related: match.related || []
				};
			});

			return { results };
		} catch (error) {
			console.error(`${this.MANAGER_NAME} Klaida:`, error);
			throw error;
		}
	}

    _processSearchResults(matches) {
		console.log('Apdorojami matches:', matches);
		const processed = new Map();

		for (const match of matches) {
			if (!match.outputs || !match.outputs[0]) {
				console.warn('Neteisingas match formatas:', match);
				continue;
			}

			const output = match.outputs[0];
			const key = `${output.type}_${match.pattern}`;
			
			console.log('Apdorojamas match:', {
				pattern: match.pattern,
				type: output.type,
				text: match.text
			});

			if (!processed.has(key)) {
				processed.set(key, {
					pattern: match.pattern,
					type: output.type,
					info: this._extractWordInfo(output),
					positions: [],
					length: match.pattern.length, // Pridedame ilgį
					related: new Set()
				});
			}

			const entry = processed.get(key);
			entry.positions.push({
				start: match.start,
				end: match.end,
				text: match.text
			});

			// Išsaugome susijusius šablonus
			if (match.related) {
				match.related.forEach(relatedPattern => {
					if (relatedPattern !== match.pattern) {
						const relatedInfo = this._findPatternInfo(relatedPattern);
						if (relatedInfo) {
							entry.related.add(JSON.stringify(relatedInfo));
						}
					}
				});
			}
		}

		// Rūšiuojame pagal ilgį (ilgiausios frazės pirma)
		return Array.from(processed.values())
			.sort((a, b) => b.length - a.length)
			.map(entry => ({
				...entry,
				related: Array.from(entry.related).map(r => JSON.parse(r))
			}));
	}

    _findPatternInfo(pattern) {
        const matches = Array.from(this.dictionaries.values())
            .filter(dict => dict.entries > 0)
            .map(dict => {
                const entry = this.searcher.patterns.get(pattern);
                if (entry && entry.data) {
                    return this._extractWordInfo(entry.data);
                }
                return null;
            })
            .filter(info => info !== null);

        return matches[0] || null;
    }

    _extractWordInfo(data) {
		console.log('Data received:', data);  // Debug
		const baseWord = data.baseWord || data.pattern;
		console.log('Base word:', baseWord);  // Debug

		// Surenkame visas reikšmes tiesiai iš searcher patterns
		const allMeanings = Array.from(this.searcher.patterns.values())
			.filter(entry => {
				console.log('Checking entry:', entry);  // Debug
				return entry.pattern === baseWord;
			})
			.map(entry => ({
				vertimas: entry.data.vertimas,
				"kalbos dalis": entry.data["kalbos dalis"],
				"bazinė forma": entry.data["bazinė forma"],
				"bazė vertimas": entry.data["bazė vertimas"],
				CERF: entry.data.CERF
			}));

		console.log('Found meanings:', allMeanings);  // Debug

		if (allMeanings.length === 0) {
			// Jei neradome reikšmių, naudojame originalius duomenis
			return {
				text: baseWord,
				type: data.type,
				vertimas: data.vertimas,
				"kalbos dalis": data["kalbos dalis"],
				"bazinė forma": data["bazinė forma"],
				"bazė vertimas": data["bazė vertimas"],
				CERF: data.CERF
			};
		}

		return {
			text: baseWord,
			type: data.type,
			homonims: allMeanings
		};
	}

    _updateSearchStats(searchTime) {
        this.statistics.searchStats.totalSearches++;
        const prevAvg = this.statistics.searchStats.averageSearchTime;
        const newAvg = prevAvg + (searchTime - prevAvg) / this.statistics.searchStats.totalSearches;
        this.statistics.searchStats.averageSearchTime = newAvg;
    }

    async _readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.onerror = e => reject(new Error('Klaida skaitant failą'));
            reader.readAsText(file);
        });
    }

    _parseJSON(text) {
        try {
            const data = JSON.parse(text);
            if (typeof data !== 'object' || data === null) {
                throw new Error('Neteisingas JSON formatas - tikimasi objekto');
            }
            return data;
        } catch (error) {
            throw new Error(`Neteisingas žodyno formatas: ${error.message}`);
        }
    }

    getDictionaryList() {
        return Array.from(this.dictionaries.values());
    }

    getStatistics() {
        return {
            ...this.statistics,
            searcherStats: this.searcher.getStats()
        };
    }

    removeDictionary(name) {
        const dict = this.dictionaries.get(name);
        if (!dict) return false;

        this.statistics.totalEntries -= dict.entries;
        this.statistics.loadedDictionaries--;
        this.dictionaries.delete(name);

        // Perkrauname žodynus
        this._rebuildDictionaries();
        
        return true;
    }

    _rebuildDictionaries() {
        this.searcher.clear();
        const existingDictionaries = Array.from(this.dictionaries.values());
        
        for (const dict of existingDictionaries) {
            console.log(`${this.MANAGER_NAME} Perkraunamas žodynas: ${dict.name}`);
            // Logika bus implementuota vėliau
        }
    }

    clearAll() {
        this.dictionaries.clear();
        this.searcher.clear();
        this.statistics = {
            totalEntries: 0,
            loadedDictionaries: 0,
            searchStats: {
                totalSearches: 0,
                averageSearchTime: 0
            }
        };
    }

	getDictionaryWords() {
    const words = new Map();
    
    // Pradinis žodžių kiekis
    console.log('Pradinis žodžių kiekis:', this.searcher.patterns.size);
    
    for (const [pattern, data] of this.searcher.patterns) {
        if (data?.data?.type === 'word') {
            words.set(pattern, data.data);
        }
    }
    
    // Patikrinti rezultatą
    console.log('Žodžių po filtravimo:', words.size);
    
    return Object.fromEntries(words);
}

	_validateDictionaryEntry(key, data) {
		if (!key || typeof key !== 'string') {
			console.warn(`${this.MANAGER_NAME} Neteisingas raktas:`, key);
			return false;
		}

		const requiredFields = ['vertimas', 'kalbos dalis', 'bazinė forma'];
		const missingFields = requiredFields.filter(field => !data[field]);

		if (missingFields.length > 0) {
			console.warn(`${this.MANAGER_NAME} Trūksta laukų ${key}:`, missingFields);
			return false;
		}

		return true;
	}

	async loadDictionaries(files) {
		this.searcher = new AhoCorasick();
		
		for (const file of files) {
			const text = await this._readFileAsText(file);
			const dictionary = this._parseJSON(text);
			const type = file.name.includes('phrases') ? 'phrase' : 'word';
			
			for (const [key, data] of Object.entries(dictionary)) {
				if (!this._validateDictionaryEntry(key, data)) continue;
				
				const entry = {
					...data,
					fullKey: key,  // Saugome pilną raktą (pvz., "på_subst")
					type,
					source: file.name,
					baseWord: key.split('_')[0]  // bazinis žodis (pvz., "på")
				};
				
				// Pridedame į searcher pagal bazinį žodį
				this.searcher.addPattern(entry.baseWord, entry);
			}
			
			this.dictionaries.set(file.name, dictionary);
		}
		
		this.searcher.buildFailureLinks();
	}
}
