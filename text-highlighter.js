export class TextHighlighter {
    constructor(dictionaryManager) {
        this.HIGHLIGHTER_NAME = '[TextHighlighter]';
        this.dictionaryManager = dictionaryManager;
        this.boundHandlePopup = this._handlePopup.bind(this);
        this.activePopup = null;
        this.wordBoundaryRegex = /[\s.,!?;:'"„"\(\)\[\]{}<>\/\-—–]/;
    }

    async processText(text, html) {
        console.log(`${this.HIGHLIGHTER_NAME} Pradedamas teksto žymėjimas`);
		const { results } = await this.dictionaryManager.findInText(text);
		console.log('Žymėjimo rezultatai:', results);

		const doc = new DOMParser().parseFromString(html, 'text/html');
		const walker = document.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
		let offset = 0;
		let node;

		while ((node = walker.nextNode())) {
			const nodeMatches = this._findMatchesInNode(results, offset, node.textContent.length);
			if (nodeMatches.length > 0) {
				node.parentNode.replaceChild(
					this._createHighlightedFragment(node.textContent, nodeMatches),
					node
				);
			}
			offset += node.textContent.length;
		}

		return doc.body.innerHTML;
	}

    _findMatchesInNode(results, offset, nodeLength) {
		if (!Array.isArray(results)) {
			console.log('Results is not an array:', results);
			return [];
		}

		const nodeMatches = [];
		for (const result of results) {
			console.log('Processing result:', result);
			
			if (!result || !result.positions) {
				console.warn('Invalid result structure:', result);
				continue;
			}

			for (const pos of result.positions) {
				const start = pos.start - offset;
				const end = pos.end - offset;

				if (start < nodeLength && end > 0) {
					console.log('Found match:', {
						start,
						end,
						text: pos.text,
						type: result.type
					});

					nodeMatches.push({
						start: Math.max(0, start),
						end: Math.min(nodeLength, end),
						text: pos.text,
						type: result.type,
						info: {
							...result.info,
							text: pos.text,
							type: result.type,
							related: result.related
						}
					});
				}
			}
		}
		
		return this._filterOverlappingMatches(nodeMatches);
	}

    _filterOverlappingMatches(matches) {
        return matches.sort((a, b) => {
            if (a.start === b.start) {
                return b.end - b.start - (a.end - a.start);
            }
            return a.start - b.start;
        }).filter((match, index) => {
            return !matches.some((otherMatch, otherIndex) => {
                return otherIndex < index && 
                       otherMatch.start <= match.start && 
                       otherMatch.end >= match.end;
            });
        });
    }

    _createHighlightedFragment(text, matches) {
        const fragment = document.createDocumentFragment();
		let lastIndex = 0;

		matches.forEach(match => {
			if (match.start > lastIndex) {
				fragment.appendChild(document.createTextNode(text.slice(lastIndex, match.start)));
			}

			const span = document.createElement('span');
			// Ryškesnis žymėjimas
			span.className = match.type === 'phrase' 
				? 'highlight-phrase'
				: 'highlight-word';
			
			span.textContent = text.slice(match.start, match.end);
			span.dataset.info = JSON.stringify(match.info);
			span.addEventListener('click', this.boundHandlePopup);
			
			fragment.appendChild(span);
			lastIndex = match.end;
		});

		if (lastIndex < text.length) {
			fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
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
