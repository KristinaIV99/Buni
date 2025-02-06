export class TextPaginator {
    constructor(options = {}) {
        this.minWordsPerPage = 250; // Minimalus žodžių skaičius puslapyje
        this.currentPage = 1;
        this.content = '';
        this.pages = [];
        this.callbacks = {
            onPageChange: options.onPageChange || (() => {})
        };
    }

    setContent(text) {
        this.content = text;
        this.pages = this.splitIntoPages(text);
        this.currentPage = 1;
        return this.getCurrentPageContent();
    }

    splitIntoPages(text) {
        // Skaidome tekstą į paragrafus (naudojame dvigubą naują eilutę kaip skyriklį)
        const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim());
        const pages = [];
        let currentPage = [];
        let wordCount = 0;

        paragraphs.forEach(paragraph => {
            const paragraphWords = paragraph.trim().split(/\s+/).length;
            
            // Jei pridėjus šį paragrafą viršysime minimalų žodžių limitą ir jau turime bent vieną paragrafą
            if (wordCount + paragraphWords > this.minWordsPerPage && currentPage.length > 0) {
                // Tikriname, ar dabartinis puslapis turi pakankamai žodžių
                const currentPageWords = currentPage.join('\n\n').split(/\s+/).length;
                if (currentPageWords >= this.minWordsPerPage) {
                    pages.push(currentPage.join('\n\n'));
                    currentPage = [];
                    wordCount = 0;
                }
            }
            
            currentPage.push(paragraph);
            wordCount += paragraphWords;
        });

        // Pridedame paskutinį puslapį, jei jis turi pakankamai žodžių
        if (currentPage.length > 0) {
            const lastPageWords = currentPage.join('\n\n').split(/\s+/).length;
            if (lastPageWords >= this.minWordsPerPage) {
                pages.push(currentPage.join('\n\n'));
            } else if (pages.length > 0) {
                // Jei paskutinis puslapis per trumpas, prijungiame jį prie ankstesnio
                const lastPage = pages.pop();
                pages.push(lastPage + '\n\n' + currentPage.join('\n\n'));
            } else {
                // Jei tai vienintelis puslapis, pridedame jį nepaisant ilgio
                pages.push(currentPage.join('\n\n'));
            }
        }

        return pages;
    }

    getCurrentPageContent() {
        return {
            content: this.pages[this.currentPage - 1] || '',
            currentPage: this.currentPage,
            totalPages: this.pages.length
        };
    }

    goToPage(pageNumber) {
        if (pageNumber < 1 || pageNumber > this.pages.length) return false;
        this.currentPage = pageNumber;
        const pageData = this.getCurrentPageContent();
        this.callbacks.onPageChange(pageData);
        return true;
    }

    nextPage() {
        return this.goToPage(this.currentPage + 1);
    }

    previousPage() {
        return this.goToPage(this.currentPage - 1);
    }

    initializeSlider(container) {
        const slider = document.createElement('input');
        slider.type = 'range';
        slider.className = 'page-slider';
        slider.min = 1;
        slider.value = 1;
        slider.max = this.pages.length;
        
        slider.addEventListener('input', (e) => {
            this.goToPage(parseInt(e.target.value));
        });
        
        this.slider = slider;
        return slider;
    }

    updateSlider() {
        if (this.slider) {
            this.slider.max = this.pages.length;
            this.slider.value = this.currentPage;
        }
    }
}
