export class TextHighlighter {
    constructor(dictionaryManager) {
        this.HIGHLIGHTER_NAME = '[TextHighlighter]';
        this.dictionaryManager = dictionaryManager;
        this.boundHandlePopup = this._handlePopup.bind(this);
        this.activePopup = null;
    }

    async processText(text, html) {
        console.log(`${this.HIGHLIGHTER_NAME} Pradedamas teksto žymėjimas`);
        
        try {
            const { results } = await this.dictionaryManager.findInText(text);
            console.log('Rasti žodžiai:', results);

            // Surenkame visus žodžius
            const words = {};
            results.forEach(result => {
                const word = result.pattern.toLowerCase();
                if (!words[word]) {
                    words[word] = {
                        pattern: result.pattern,
                        type: result.type,
                        info: result.info
                    };
                }
            });

            // Pakeičiame tekstą HTML dokumente
            const doc = new DOMParser().parseFromString(html, 'text/html');
            this._processNode(doc.body, words);

            return doc.body.innerHTML;
        } catch (error) {
            console.error('Klaida žymint tekstą:', error);
            return html;
        }
    }

    _processNode(node, words) {
        if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent;
            const newNode = this._highlightWords(text, words);
            if (newNode) {
                node.parentNode.replaceChild(newNode, node);
            }
        } else {
            // Praleidiame jei tai yra script arba style elementas
            if (node.tagName === 'SCRIPT' || node.tagName === 'STYLE') {
                return;
            }
            
            // Rekursyviai einame per visus vaikinius elementus
            Array.from(node.childNodes).forEach(child => {
                this._processNode(child, words);
            });
        }
    }

    _highlightWords(text, words) {
		const wordBoundaryRegex = /[\s.,!?;:'"„"\(\)\[\]{}<>\/\-—–]/;
		
		function isWordBoundary(char) {
			return !char || wordBoundaryRegex.test(char);
		}

		function isFullWord(text, start, end) {
			const prevChar = start > 0 ? text[start - 1] : ' ';
			const nextChar = end < text.length ? text[end] : ' ';
			return isWordBoundary(prevChar) && isWordBoundary(nextChar);
		}

		const matches = [];
		Object.keys(words).forEach(word => {
			let index = 0;
			const lowerText = text.toLowerCase();
			
			while ((index = lowerText.indexOf(word, index)) !== -1) {
				// Tikriname ar tai pilnas žodis
				if (isFullWord(text, index, index + word.length)) {
					matches.push({
						start: index,
						end: index + word.length,
						word: text.slice(index, index + word.length),
						...words[word]
					});
				}
				index += 1; // Ieškome toliau nuo sekančios pozicijos
			}
		});

		// Rūšiuojame ir filtruojame persidengimus
		matches.sort((a, b) => a.start - b.start);
		const filteredMatches = this._filterOverlappingMatches(matches);

		// Kuriame fragmentą
		const fragment = document.createDocumentFragment();
		let lastIndex = 0;

		filteredMatches.forEach(match => {
			if (match.start > lastIndex) {
				fragment.appendChild(
					document.createTextNode(text.slice(lastIndex, match.start))
				);
			}

			const span = document.createElement('span');
			span.className = match.type === 'phrase' ? 'highlight-phrase' : 'highlight-word';
			span.textContent = match.word;
			span.dataset.info = JSON.stringify(match.info);
			span.addEventListener('click', this.boundHandlePopup);
			fragment.appendChild(span);

			lastIndex = match.end;
		});

		if (lastIndex < text.length) {
			fragment.appendChild(
				document.createTextNode(text.slice(lastIndex))
			);
		}

		return fragment;
	}

    _handlePopup(event) {
        event.stopPropagation();
        this._removeAllPopups();

        const info = JSON.parse(event.target.dataset.info);
        const popup = document.createElement('div');
        popup.className = 'word-info-popup bg-white shadow-lg rounded-lg p-4 absolute z-50';

        let content = `
            <div class="flex flex-col gap-2">
                <div class="text-lg font-bold border-b pb-2 flex justify-between items-center">
                    <span>${info.text}</span>
                    <span class="text-xs px-2 py-1 rounded ${
                        info.type === 'phrase' ? 'bg-yellow-100' : 'bg-blue-100'
                    }">
                        ${info.type === 'phrase' ? 'Frazė' : 'Žodis'}
                    </span>
                </div>
                <div class="grid gap-1">
                    <div><span class="font-semibold">Vertimas:</span> ${info.vertimas}</div>
                    <div><span class="font-semibold">Kalbos dalis:</span> ${info["kalbos dalis"]}</div>
                    <div><span class="font-semibold">Bazinė forma:</span> ${info["bazinė forma"]}</div>
                    <div><span class="font-semibold">Bazės vertimas:</span> ${info["bazė vertimas"]}</div>
                    <div><span class="font-semibold">CERF:</span> ${info.CERF}</div>
                </div>`;

        if (info.related && info.related.length > 0) {
            content += `
                <div class="mt-3 border-t pt-3">
                    <div class="font-semibold mb-2">Susiję šablonai:</div>
                    <div class="grid gap-2">`;
            
            info.related.forEach(related => {
                content += `
                    <div class="bg-gray-50 p-2 rounded text-sm">
                        <div class="font-medium">${related.pattern || related.text}</div>
                        <div class="text-gray-600 text-xs">
                            ${related.type === 'phrase' ? 'Frazė' : 'Žodis'} • 
                            ${related.vertimas} • 
                            CERF: ${related.CERF}
                        </div>
                    </div>`;
            });
            
            content += `
                    </div>
                </div>`;
        }

        content += `</div>`;
        popup.innerHTML = content;

        const rect = event.target.getBoundingClientRect();
        popup.style.left = `${window.scrollX + rect.left}px`;
        popup.style.top = `${window.scrollY + rect.bottom + 5}px`;
        
        document.body.appendChild(popup);
        this.activePopup = popup;
        this._adjustPopupPosition(popup);

        // Pridedame event listener popupo uždarymui
        setTimeout(() => {
            document.addEventListener('click', this._handleDocumentClick.bind(this));
        }, 0);
    }

    _adjustPopupPosition(popup) {
        const rect = popup.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        // Horizontalus pozicionavimas
        if (rect.right > viewportWidth) {
            const overflow = rect.right - viewportWidth;
            popup.style.left = `${parseInt(popup.style.left) - overflow - 10}px`;
        }

        // Vertikalus pozicionavimas
        if (rect.bottom > viewportHeight) {
            popup.style.top = `${parseInt(popup.style.top) - rect.height - 25}px`;
        }
    }

    _handleDocumentClick(event) {
        if (this.activePopup && !event.target.closest('.word-info-popup')) {
            this._removeAllPopups();
            document.removeEventListener('click', this._handleDocumentClick.bind(this));
        }
    }

    _removeAllPopups() {
        const popups = document.querySelectorAll('.word-info-popup');
        popups.forEach(popup => popup.remove());
        this.activePopup = null;
    }
}
