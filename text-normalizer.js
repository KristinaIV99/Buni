const DEBUG = true;  // arba false kai norėsime išjungti
console.log('TEXT NORMALIZER LOADED');  // Pridėti

export class TextNormalizer {
    constructor() {
        this.CLASS_NAME = '[TextNormalizer]';
        if (DEBUG) console.log(`${this.CLASS_NAME} Konstruktorius inicializuotas`);
        
        this.patterns = {
           sectionBreak: /^[&][ \t]*$/gm,
           emphasis: [/_([^_]+?)_/g, /(?<!\*)\*(?!\*)([^*]+?)\*(?!\*)/g],
           strong: [/__([^_]+?)__/g, /\*\*([^*]+?)\*\*/g],
           headers: /^(#{1,6})\s*(.+)$/gm,
           lists: /^[\s-]*[-+*]\s+/gm,
           blockquotes: /^>\s*(.+)$/gm,
           horizontalRules: /^(?:[-*_]\s*){3,}$/gm,
           codeBlocks: /```([\s\S]*?)```/g,
           inlineCode: /`([^`]+)`/g,
           enDash: /–/g,
           quotes: /[""]/g,         // Tik dvigubos kabutės
           apostrophe: /[']/g,      // Apostrofai
           strongEmphasis: [/\*\*\*([^*]+?)\*\*\*/g],
           chapterTitle: /^#\s(.+)$/m,
           emptyLines: /\n\s*\n/g,
           paragraphs: /([^\n])\n([^\n])/g,
           images: /!\[([^\]]*)\]\([^)]+\)/g,
           htmlImages: /<img[^>]+>/g,
           markdownLinks: /\[([^\]]+)\]\([^\)]+\)/g,
           htmlLinks: /<a[^>]*>([^<]*)<\/a>/g,
           localPaths: /(?:\.\.?\/)*[a-zA-Z0-9_-]+\/[a-zA-Z0-9_\/-]+\.[a-zA-Z0-9]+/g,
           htmlTags: /<[^>]+>/g,
           bareUrls: /(?:https?:\/\/)[^\s)]+/g
        };
    }

    debugLog(...args) {
        if (DEBUG) {
            console.log(`${this.CLASS_NAME} [DEBUG]`, ...args);
        }
    }

   handleSectionBreaks(text) {
       this.debugLog('Apdorojami sekcijų skirtukai');
       const result = text.replace(/^[&][ \t]*$/gm, '§SECTION_BREAK§');
       this.debugLog('Sekcijų skirtukų rezultatas:', result);
       return result;
   }

   normalizeMarkdown(text) {
       console.log('=== NORMALIZE MARKDOWN PRADŽIA ===');
       
       if (!text || typeof text !== 'string') {
           throw new Error('Invalid input: text must be a non-empty string');
       }

       this.debugLog('Pradedamas Markdown normalizavimas');
       console.log('Gautas tekstas normalizavimui:', text.substring(0, 200));

       let normalized = text;
       
       normalized = this.removeUnwantedElements(normalized);
       this.debugLog('Po nereikalingų elementų pašalinimo:', normalized);
       
       normalized = this.handleHtmlContent(normalized);
       this.debugLog('Po HTML apdorojimo:', normalized);
       
       normalized = this.handleSectionBreaks(normalized);
       this.debugLog('Po sekcijų skirtukų:', normalized);
       
       normalized = this.handleEmphasis(normalized);
       this.debugLog('Po pabrėžimų:', normalized);
       
       normalized = this.handleHeaders(normalized);
       this.debugLog('Po antraščių:', normalized);
       
       normalized = this.handleParagraphsAndSpacing(normalized);
       this.debugLog('Po pastraipų ir tarpų:', normalized);
       
       normalized = this.processBasicElements(normalized);
       this.debugLog('Po bazinių elementų:', normalized);
       
       normalized = this.normalizeQuotes(normalized);
       this.debugLog('Po kabučių normalizavimo:', normalized);
       
       normalized = this.normalizeCodeBlocks(normalized);
       this.debugLog('Po kodo blokų:', normalized);
       
       normalized = this.handleSpecialSymbols(normalized);
       this.debugLog('Po specialių simbolių:', normalized);
       
       normalized = this.handleImages(normalized);
       this.debugLog('Po paveikslėlių:', normalized);
       
       this.debugLog('Markdown normalizavimas baigtas');

       console.log('=== NORMALIZE MARKDOWN PABAIGA ===');
       return normalized;
   }

   handleHtmlContent(text) {
       this.debugLog('Pradedamas HTML turinio apdorojimas');
       let processed = text.replace(this.patterns.htmlLinks, '$1');
       processed = processed.replace(/<img[^>]+alt=["']([^"']+)["'][^>]*>/g, '$1');
       processed = processed.replace(this.patterns.htmlImages, '');
       processed = processed.replace(this.patterns.htmlTags, '');
       this.debugLog('HTML apdorojimo rezultatas:', processed);
       return processed;
   }

   removeUnwantedElements(text) {
       this.debugLog('Šalinami nereikalingi elementai');
       const result = text
           .replace(this.patterns.markdownLinks, '$1')
           .replace(this.patterns.bareUrls, '')
           .replace(this.patterns.localPaths, '')
           .replace(/[ \t]+/g, ' ')
           .split('\n')
           .map(line => line.trim())
           .join('\n');
       this.debugLog('Pašalintų elementų rezultatas:', result);
       return result;
   }

   handleHeaders(text) {
       this.debugLog('Apdorojamos antraštės');
       let result = text.replace(this.patterns.chapterTitle, '# $1\n\n');
       result = result.replace(this.patterns.headers, '$1 $2\n\n');
       this.debugLog('Antraščių rezultatas:', result);
       return result;
   }

   handleParagraphsAndSpacing(text) {
       this.debugLog('Apdorojamos pastraipos ir tarpai');
       const result = text
           .replace(this.patterns.paragraphs, '$1\n\n$2')
           .replace(/^>\s*(.+)$/gm, '> $1\n\n')
           .replace(/\n{4,}/g, '\n\n\n')
           .trim();
       this.debugLog('Pastraipų ir tarpų rezultatas:', result);
       return result;
   }

   handleImages(text) {
       this.debugLog('Apdorojami paveikslėliai');
       const result = text
           .replace(this.patterns.images, '$1')
           .replace(this.patterns.htmlImages, '');
       this.debugLog('Paveikslėlių rezultatas:', result);
       return result;
   }

   processBasicElements(text) {
       this.debugLog('Apdorojami baziniai elementai');
       const result = text
           .replace(this.patterns.lists, '* ')
           .replace(this.patterns.horizontalRules, '—');
       this.debugLog('Bazinių elementų rezultatas:', result);
       return result;
   }

   handleSpecialSymbols(text) {
       console.log('HANDLE SPECIAL SYMBOLS CALLED');  // Pridėti
       this.debugLog('Apdorojami specialūs simboliai');
       this.debugLog('Pradinis tekstas:', text);
       
       const result = text
           .replace(this.patterns.quotes, '"')
           .replace(this.patterns.apostrophe, "'")
           .replace(this.patterns.enDash, '-')
           .replace(/\.{3}/g, '…');
           
       this.debugLog('Specialių simbolių rezultatas:', result);
       return result;
   }

   normalizeQuotes(text) {
       this.debugLog('Normalizuojamos kabutės');
       const result = text
           .replace(/^(\s*)(?:&|>+)/gm, '>')
           .replace(this.patterns.blockquotes, '> $1');
       this.debugLog('Kabučių normalizavimo rezultatas:', result);
       return result;
   }

   normalizeCodeBlocks(text) {
       this.debugLog('Normalizuojami kodo blokai');
       const result = text
           .replace(this.patterns.codeBlocks, (_, code) => `\n\n\`\`\`\n${code.trim()}\n\`\`\`\n\n`)
           .replace(this.patterns.inlineCode, '`$1`');
       this.debugLog('Kodo blokų rezultatas:', result);
       return result;
   }

   handleEmphasis(text) {
       this.debugLog('Apdorojami pabrėžimai');
       let result = text;
       result = result.replace(this.patterns.strongEmphasis, '___$1___');
       
       this.patterns.strong.forEach(regex => {
           result = result.replace(regex, '__$1__');
       });
       
       this.patterns.emphasis.forEach(regex => {
           result = result.replace(regex, '_$1_');
       });
       
       this.debugLog('Pabrėžimų rezultatas:', result);
       return result;
   }
}
