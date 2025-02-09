export class TextHighlighter {
    constructor(dictionaryManager) {
        this.HIGHLIGHTER_NAME = '[TextHighlighter]';
        this.dictionaryManager = dictionaryManager;
        this.boundHandlePopup = this._handlePopup.bind(this);
        this.activePopup = null;
		this.activePopup = null;

		// Pridedame globalų event listener
		document.addEventListener('click', (e) => {
			const target = e.target.closest('.highlight-word, .highlight-phrase');
			if (target) {
				console.log('Clicked on word:', target);
				this._handlePopup(e);
			}
		});
	}

    async processText(text, html) {
        console.log(`${this.HIGHLIGHTER_NAME} Pradedamas teksto žymėjimas`);
    
		try {
			const { results } = await this.dictionaryManager.findInText(text);
			const doc = new DOMParser().parseFromString(html, 'text/html');

			// Saugome puslapiavimo elementus
			const paginationControls = doc.querySelector('.pagination-controls');
			if (paginationControls) {
				paginationControls.remove();
			}

			// Surenkame žodžius ir frazes
			const patterns = {};
			results.forEach(result => {
				const pattern = result.pattern.toLowerCase();
				if (!patterns[pattern]) {
					patterns[pattern] = {
						pattern: result.pattern,
						type: result.type,
						info: result.info,
						length: pattern.length
					};
				}
			});

			// Rūšiuojame patterns
			const sortedPatterns = Object.entries(patterns).sort((a, b) => b[1].length - a[1].length);
			console.log('Surūšiuoti šablonai:', sortedPatterns);

			// Apdorojame tekstą
			this._processNode(doc.body, Object.fromEntries(sortedPatterns));

			// Grąžiname puslapiavimo elementus
			if (paginationControls) {
				doc.body.appendChild(paginationControls);
			}

			return doc.body.innerHTML;
		} catch (error) {
			console.error('Klaida žymint tekstą:', error);
			return html;
		}
	}

    _processNode(node, words) {
		console.log('Processing node:', node.nodeType, node.textContent?.slice(0, 50));
		
		if (node.nodeType === Node.TEXT_NODE && !this._isInPaginationControls(node)) {
			const text = node.textContent;
			const newNode = this._highlightWords(text, words);
			if (newNode) {
				node.parentNode.replaceChild(newNode, node);
			}
		} else if (node.childNodes && !node.classList?.contains('pagination-controls')) {
			Array.from(node.childNodes).forEach(child => {
				this._processNode(child, words);
			});
		}
	}

	_isInPaginationControls(node) {
		let current = node;
		while (current) {
			if (current.classList?.contains('pagination-controls')) {
				return true;
			}
			current = current.parentNode;
		}
		return false;
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
				if (isFullWord(text, index, index + word.length)) {
					matches.push({
						start: index,
						end: index + word.length,
						word: text.slice(index, index + word.length),
						...words[word]
					});
				}
				index += 1;
			}
		});

		matches.sort((a, b) => a.start - b.start);
		const filteredMatches = this._filterOverlappingMatches(matches);

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
			span.dataset.info = JSON.stringify({
				text: match.word,
				type: match.type,
				vertimas: match.vertimas || match.info?.vertimas,
				"kalbos dalis": match["kalbos dalis"] || match.info?.["kalbos dalis"],
				"bazinė forma": match["bazinė forma"] || match.info?.["bazinė forma"],
				"bazė vertimas": match["bazė vertimas"] || match.info?.["bazė vertimas"],
				CERF: match.CERF || match.info?.CERF
			});

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

	_filterOverlappingMatches(matches) {
		// Rūšiuojame pagal poziciją ir ilgį (ilgesni turi prioritetą)
		matches.sort((a, b) => {
			if (a.start === b.start) {
				return b.word.length - a.word.length;
			}
			return a.start - b.start;
		});

		// Filtruojame persidengimus
		return matches.filter((match, index) => {
			// Ar šis match nepersidengia su jokiu ankstesniu match
			return !matches.some((otherMatch, otherIndex) => {
				// Tikriname tik ankstesnius matches
				if (otherIndex >= index) return false;
				
				// Ar persidengia pozicijos
				const overlaps = !(otherMatch.end <= match.start || 
								otherMatch.start >= match.end);
				
				return overlaps;
			});
		});
	}

    _handlePopup(event) {
		console.log('Popup event:', event);
		console.log('Target:', event.target);
		console.log('Dataset:', event.target.dataset);
		
		event.stopPropagation();
		event.preventDefault();
		this._removeAllPopups();

		try {
			const data = event.target.dataset.info;
			console.log('Raw data:', data);
			// Pakeičiame HTML entities į normalius simbolius
			const info = JSON.parse(data.replace(/&quot;/g, '"'));
			console.log('Parsed info:', info);
			
			const popup = document.createElement('div');
			popup.className = 'word-info-popup';
			
			// Pridedame tiesiogiai stilius
			popup.style.cssText = `
				position: absolute;
				z-index: 9999;
				display: block;
				visibility: visible;
				opacity: 1;
				background: var(--background-light, white);
				color: var(--text-light, black);
				box-shadow: 0 2px 5px rgba(0,0,0,0.2);

				@media (prefers-color-scheme: dark) {
					background: var(--background-dark, #1a1a1a);
					color: var(--text-dark, #e0e0e0);
					box-shadow: 0 2px 8px rgba(0,0,0,0.3);
				}
			`;

			popup.innerHTML = `
				<div class="word-info-title">
					<span>${info.text}</span>
					<span class="word-info-type ${info.type}">
						${info.type === 'phrase' ? 'Frazė' : 'Žodis'}
					</span>
				</div>
				<div class="word-info-grid">
					<div><span class="word-info-label">Vertimas:</span> ${info.vertimas}</div>
					<div><span class="word-info-label">Kalbos dalis:</span> ${info["kalbos dalis"]}</div>
					<div><span class="word-info-label">Bazinė forma:</span> ${info["bazinė forma"]}</div>
					<div><span class="word-info-label">Bazės vertimas:</span> ${info["bazė vertimas"]}</div>
					<div><span class="word-info-label">CERF:</span> ${info.CERF}</div>
					${info.related?.length ? `
						<div class="word-info-related">
							<div class="word-info-label">Susiję:</div>
							${info.related.map(r => `<div>${r.pattern} (${r.type})</div>`).join('')}
						</div>
					` : ''}
				</div>
			`;
			const rect = event.target.getBoundingClientRect();
			popup.style.left = `${window.scrollX + rect.left}px`;
			popup.style.top = `${window.scrollY + rect.bottom + 5}px`;
			
			document.body.appendChild(popup);
			this.activePopup = popup;
			this._adjustPopupPosition(popup);

			// Pakeičiame į tiesioginį event listener
			document.addEventListener('click', (e) => {
				if (!popup.contains(e.target) && !event.target.contains(e.target)) {
					popup.remove();
				}
			});

		} catch (error) {
			console.error('Error in popup:', error);
			console.error('Stack:', error.stack);
		}
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
