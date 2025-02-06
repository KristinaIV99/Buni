export class TextPaginator {
    constructor(options = {}) {
        this.wordsPerPage = options.wordsPerPage || 350;
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
        // Skaidome į pastraipas
        const pastraipos = text.split(/\n\s*\n/) || [];
        const pages = [];
        let currentPage = [];
        let wordCount = 0;

        pastraipos.forEach(pastraipa => {
            const words = pastraipa.trim().split(/\s+/).length;
            
            if (wordCount + words > this.wordsPerPage && currentPage.length > 0) {
                pages.push(currentPage.join('\n\n'));
                currentPage = [];
                wordCount = 0;
            }
            
            currentPage.push(pastraipa);
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
