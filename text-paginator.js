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
        // Konvertuojame HTML į paragrafus
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = text;
        
        // Surandame visus <p> elementus arba teksto blokus
        const paragraphs = [];
        const walker = document.createTreeWalker(
            tempDiv,
            NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
            {
                acceptNode: function(node) {
                    // Priimame tik paragrafus arba teksto mazgus, kurie turi ne tuščią tekstą
                    if ((node.nodeType === Node.ELEMENT_NODE && node.tagName === 'P') ||
                        (node.nodeType === Node.TEXT_NODE && node.textContent.trim())) {
                        return NodeFilter.FILTER_ACCEPT;
                    }
                    return NodeFilter.FILTER_SKIP;
                }
            }
        );

        let currentNode;
        while (currentNode = walker.nextNode()) {
            if (currentNode.nodeType === Node.TEXT_NODE) {
                const text = currentNode.textContent.trim();
                if (text) {
                    paragraphs.push(text);
                }
            } else if (currentNode.tagName === 'P') {
                paragraphs.push(currentNode.outerHTML);
            }
        }

        const pages = [];
        let currentPage = [];
        let currentPageWordCount = 0;

        for (let i = 0; i < paragraphs.length; i++) {
            const paragraph = paragraphs[i];
            // Išvalome HTML žymes skaičiuojant žodžius
            const cleanText = paragraph.replace(/<[^>]*>/g, '');
            const paragraphWordCount = cleanText.trim().split(/\s+/).length;

            // Jei dabartinis puslapis tuščias, pridedame paragrafą nepriklausomai nuo jo ilgio
            if (currentPage.length === 0) {
                currentPage.push(paragraph);
                currentPageWordCount = paragraphWordCount;
                continue;
            }

            // Jei pridėjus šį paragrafą viršysime minimalų žodžių skaičių ir dabartinis puslapis jau turi >= 250 žodžių
            if (currentPageWordCount >= this.minWordsPerPage) {
                pages.push(currentPage.join('\n'));
                currentPage = [paragraph];
                currentPageWordCount = paragraphWordCount;
            } else {
                currentPage.push(paragraph);
                currentPageWordCount += paragraphWordCount;
            }
        }

        // Pridedame paskutinį puslapį
        if (currentPage.length > 0) {
            pages.push(currentPage.join('\n'));
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
