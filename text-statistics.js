const DEBUG = true;  // arba false kai norėsime išjungti

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
       this.debugLog('Pradedu teksto statistikos skaičiavimą');
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
           if (!isKnown && !this._isProperNoun(word, text)) {
               this.debugLog('Rastas nežinomas žodis (ne tikrinis):', word);
               unknownWords.add(word);
           }
       }
       
       const stats = {
           totalWords: words.length,
           uniqueWords: uniqueWords.size,
           unknownWords: unknownWords.size,
           unknownPercentage: ((unknownWords.size / uniqueWords.size) * 100).toFixed(2)
       };

       this.debugLog('Statistika:', stats);
       return stats;
   }
   
   _getWords(text) {
       this.debugLog('Išskiriami žodžiai iš teksto');
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

       const words = cleanText.split(' ')
           .filter(word => word.length > 0 && /\p{L}/u.test(word))
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
   
   _isProperNoun(word, text) {
       this.debugLog('Tikrinu ar žodis yra tikrinis:', word);

       // Ieškome žodžio su didžiąja raide ne sakinio pradžioje
       const midSentenceRegex = new RegExp(`[.!?]\\s+([^.!?]+?\\s+${word}\\s|${word}\\s)`, 'gi');
       const midSentenceMatches = text.match(midSentenceRegex) || [];
       
       for (const match of midSentenceMatches) {
           if (match.includes(` ${word[0].toUpperCase()}${word.slice(1)}`)) {
               this.debugLog('Rastas žodis su didžiąja raide sakinio viduryje:', match.trim());
               return true;
           }
       }

       // Skaičiuojame žodžio naudojimą su didžiąja/mažąja raide
       const capitalizedRegex = new RegExp(`\\b${word[0].toUpperCase()}${word.slice(1)}\\b`, 'g');
       const lowercaseRegex = new RegExp(`\\b${word.toLowerCase()}\\b`, 'g');

       const capitalizedCount = (text.match(capitalizedRegex) || []).length;
       const lowercaseCount = (text.match(lowercaseRegex) || []).length;

       this.debugLog('Žodžio statistika:', {
           žodis: word,
           suDidžiąjaRaide: capitalizedCount,
           suMažąjaRaide: lowercaseCount
       });

       const isProperNoun = capitalizedCount > lowercaseCount && capitalizedCount > 1;
       this.debugLog('Išvada:', isProperNoun ? 'Tikrinis daiktavardis' : 'Ne tikrinis daiktavardis');
       
       return isProperNoun;
   }
   
   getUnknownWords(text, knownWords) {
       this.debugLog('Pradedu nežinomų žodžių paiešką');
       const words = this._getWords(text);
       this.debugLog('Rasti žodžiai (pirmi 10):', words.slice(0, 10));

       const uniqueWords = new Set(words.map(word => 
           word.toLowerCase()
           .replace(/[.,!?;:#\-]/g, '')
           .replace(/[''""'\u201C\u201D\u2018\u2019"]/gu, function(match) {
               return /['']/.test(match) ? match : '';
           })
           .trim()
       ).filter(word => word.length > 0));
       
       this.debugLog('Unikalių žodžių kiekis:', uniqueWords.size);
       
       const unknownWords = [];
       for (const word of uniqueWords) {
           this.debugLog('Tikrinu žodį:', word);

           if (this._isWordInDictionary(word, knownWords)) {
               this.debugLog('Žodis rastas žodyne:', word);
               continue;
           }

           if (this._isProperNoun(word, text)) {
               this.debugLog('Žodis yra tikrinis daiktavardis:', word);
               continue;
           }

           this.debugLog('Žodis nežinomas ir ne tikrinis:', word);
           unknownWords.push(word);
       }

       this.debugLog('Nežinomų žodžių kiekis:', unknownWords.length);
       this.debugLog('Pirmi 10 nežinomų žodžių:', unknownWords.slice(0, 10));
       
       return unknownWords;
   }
}
