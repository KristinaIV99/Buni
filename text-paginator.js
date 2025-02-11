export class TextPaginator {
    constructor(options = {}) {
        this.minWordsPerPage = 300; // Minimalus žodžių skaičius puslapyje
        this.currentPage = 1;
        this.content = '';
        this.pages = [];
        this.callbacks = {
            onPageChange: options.onPageChange || (() => {})
        };
    }

    getCurrentPage() {
        return this.currentPage;
    }

    setContent(text) {
        this.content = text;
        this.pages = this.splitIntoPages(text);
        this.currentPage = 1;
        return {
            ...this.getCurrentPageContent(),
            currentPage: this.getCurrentPage()
        };
    }

    splitIntoPages(text) {
		// Pašaliname HTML žymes skaičiuojant žodžius
		const stripHtml = (html) => {
			const tmp = document.createElement('div');
			tmp.innerHTML = html;
			return tmp.textContent || tmp.innerText || '';
		};

		const sentences = text.match(/[^\n]+/g) || [];
		const pages = [];
		let currentPage = [];
		let wordCount = 0;

		for(let i = 0; i < sentences.length; i++) {
			const sentence = sentences[i];
			const plainText = stripHtml(sentence);
			const words = plainText.trim().split(/\s+/).length;
			
			if (currentPage.length === 0) {
				currentPage.push(sentence);
				wordCount = words;
				continue;
			}

			if (wordCount >= this.minWordsPerPage) {
				pages.push(currentPage.join(''));
				currentPage = [sentence];
				wordCount = words;
			} else {
				currentPage.push(sentence);
				wordCount += words;
			}
		}

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
            console.log('Atnaujinamas slankiklis:', this.currentPage, 'iš', this.pages.length);
        }
    }
}
