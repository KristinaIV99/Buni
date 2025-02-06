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
        // Skaidome į paragrafus (dviguba nauja eilutė)
        const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim());
        const pages = [];
        let currentPage = [];
        let wordCount = 0;

        paragraphs.forEach(paragraph => {
            const words = paragraph.trim().split(/\s+/).length;
            
            if (wordCount + words > this.minWordsPerPage && currentPage.length > 0) {
                pages.push(currentPage.join('\n\n'));
                currentPage = [];
                wordCount = 0;
            }
            
            currentPage.push(paragraph);
            wordCount += words;
        });

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
            console.log('Atnaujinamas slankiklis:', this.currentPage, 'iš', this.pages.length);
        }
    }
}
