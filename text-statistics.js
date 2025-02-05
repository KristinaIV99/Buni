export class TextStatistics {
    calculateStats(text, knownWords) {
        const words = this._getWords(text);
        const uniqueWords = new Set(words.map(word => 
            word.toLowerCase()
            .replace(/[.,!?;:#\-]/g, '')
            .replace(/[''""'\u201C\u201D\u2018\u2019"]/gu, function(match) {
                return /['']/.test(match) ? match : '';
            })
            .trim()
        ).filter(word => word.length > 0));
        
        const unknownWords = new Set();
        for (const word of uniqueWords) {
            const isKnown = this._isWordInDictionary(word, knownWords);
            if (!isKnown) {
                unknownWords.add(word);
            }
        }
        
        return {
            totalWords: words.length,
            uniqueWords: uniqueWords.size,
            unknownWords: unknownWords.size,
            unknownPercentage: ((unknownWords.size / uniqueWords.size) * 100).toFixed(2)
        };
    }
    
    _getWords(text) {
        const normalizedText = text.normalize('NFC');

        const cleanText = normalizedText
            .replace(/§SECTION_BREAK§/g, ' ')
            .replace(/<[^>]+>/g, ' ')
            .replace(/[0-9]+(?:_+)?/g, ' ')
            .replace(/\s-\s/g, ' ')
            .replace(/[_#\[\](){}.,!?;:""'\u201C\u201D\u2018\u2019"]/g, function(match) {
                if (/[''\u2019]/.test(match)) {
                    return match;
                }
                return ' ';
            })
            .replace(/___\w+/g, ' ')
            .replace(/_\w+/g, ' ')
            .replace(/\s+/g, ' ')
            .replace(/[0-9]/g, ' ')
            .replace(/[•…"""]/g, ' ')
            .replace(/^"+|"+$/g, '')
            .replace(/"+/g, ' ')
            .replace(/[%‰]/g, '')
            .trim();

        return cleanText.split(' ')
            .filter(word => word.length > 0 && /\p{L}/u.test(word))
            .map(word => word.trim());
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

        return Object.keys(knownWords).some(dictWord => {
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
    }
    
    getUnknownWords(text, knownWords) {
        const words = this._getWords(text);
        const uniqueWords = new Set(words.map(word => 
            word.toLowerCase()
            .replace(/[.,!?;:#\-]/g, '')
            .replace(/[''""'\u201C\u201D\u2018\u2019"]/gu, function(match) {
                return /['']/.test(match) ? match : '';
            })
            .trim()
        ).filter(word => word.length > 0));
        
        const unknownWords = [];
        for (const word of uniqueWords) {
            if (!this._isWordInDictionary(word, knownWords)) {
                unknownWords.push(word);
            }
        }
        return unknownWords;
    }
}
