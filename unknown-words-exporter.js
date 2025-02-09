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
        
        // Išsaugome originalų tekstą prieš valymą
        const originalText = text;
        const cleanText = text.replace(/<[^>]+>/g, ' ');
        
        // Pagerintas sakinių atskyrimas
        const sentenceRegex = /[^.!?]+[.!?]+/g;
        
        unknownWords.forEach(word => {
            // Lankstesnė žodžių paieška
            const wordPattern = new RegExp(word, 'i');
            
            // Ieškome tiek originaliame, tiek išvalytame tekste
            const sentences = [
                ...(originalText.match(sentenceRegex) || []),
                ...(cleanText.match(sentenceRegex) || [])
            ];
            
            const matchingSentences = sentences
                .filter(sentence => wordPattern.test(sentence))
                .map(sentence => sentence.trim());

            if (matchingSentences.length > 0) {
                // Pasirenkame trumpiausią tinkamą sakinį
                const bestSentence = matchingSentences.reduce((a, b) => 
                    a.length <= b.length ? a : b
                );
                this.sentences.set(word, new Set([bestSentence]));
            }
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
