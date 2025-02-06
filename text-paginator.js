export class TextPaginator {
    constructor(options = {}) {
        this.minWordsPerPage = 250;
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
        // Padalinti tekstą į paragrafus pagal dvigubą naują eilutę arba pastraipas
        let paragraphs = text.split(/\n\s*\n|\r\n\s*\r\n/).map(p => p.trim()).filter(p => p);
        
        const pages = [];
        let currentPage = [];
        let currentPageWordCount = 0;

        for (let i = 0; i < paragraphs.length; i++) {
            const paragraph = paragraphs[i];
            const paragraphWordCount = paragraph.split(/\s+/).length;

            // Jei dabartinis puslapis tuščias, pridedame paragrafą nepriklausomai nuo jo ilgio
            if (currentPage.length === 0) {
                currentPage.push(paragraph);
                currentPageWordCount = paragraphWordCount;
                continue;
            }

            // Jei pridėjus šį paragrafą viršysime minimalų žodžių skaičių
            // IR dabartinis puslapis jau turi pakankamai žodžių (>= 250)
            // TADA užbaigiame puslapį ir pradedame naują
            if (currentPageWordCount >= this.minWordsPerPage) {
                pages.push(currentPage.join('\n\n'));
                currentPage = [paragraph];
                currentPageWordCount = paragraphWordCount;
            } else {
                // Pridedame paragrafą prie dabartinio puslapio
                currentPage.push(paragraph);
                currentPageWordCount += paragraphWordCount;
            }
        }

        // Pridedame paskutinį puslapį
        if (currentPage.length > 0) {
            pages.push(currentPage.join('\n\n'));
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
