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
        // Sukuriame DOM elementą iš HTML
        const container = document.createElement('div');
        container.innerHTML = text;
        
        // Renkame tik <p> elementus
        const paragraphs = Array.from(container.getElementsByTagName('p'));
        
        const pages = [];
        let currentPage = [];
        let currentPageWordCount = 0;

        paragraphs.forEach(p => {
            // Gauname pilną paragrafo HTML
            const paragraphHtml = p.outerHTML;
            // Skaičiuojame žodžius tik iš teksto turinio
            const wordCount = p.textContent.trim().split(/\s+/).length;

            // Jei puslapis tuščias, pridedam pirmą paragrafą
            if (currentPage.length === 0) {
                currentPage.push(paragraphHtml);
                currentPageWordCount = wordCount;
                return;
            }

            // Jei dabartinis puslapis jau turi >= 250 žodžių, pradedame naują
            if (currentPageWordCount >= this.minWordsPerPage) {
                pages.push(currentPage.join(''));
                currentPage = [paragraphHtml];
                currentPageWordCount = wordCount;
            } else {
                // Kitaip pridedame prie esamo puslapio
                currentPage.push(paragraphHtml);
                currentPageWordCount += wordCount;
            }
        });

        // Pridedame paskutinį puslapį
        if (currentPage.length > 0) {
            pages.push(currentPage.join(''));
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
