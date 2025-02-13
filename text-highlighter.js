export class TextHighlighter {
    constructor(dictionaryManager) {
        this.HIGHLIGHTER_NAME = '[TextHighlighter]';
        this.dictionaryManager = dictionaryManager;
        this.boundHandlePopup = this._handlePopup.bind(this);
        this.activePopup = null;
		this.activePopup = null;
        this.savedHighlights = null;

		// Pridedame globalų event listener
		document.addEventListener('click', (e) => {
			const target = e.target.closest('.highlight-word, .highlight-phrase');
			if (target) {
				console.log('Clicked on word:', target);
				this._handlePopup(e);
			}
		});
	}

    // Naujas metodas pažymėjimų išsaugojimui
    saveHighlights() {
        const highlights = document.querySelectorAll('.highlight-word, .highlight-phrase');
        this.savedHighlights = Array.from(highlights).map(el => ({
            text: el.textContent,
            info: el.dataset.info,
            type: el.classList.contains('highlight-phrase') ? 'phrase' : 'word'
        }));
        return this.savedHighlights;
    }

    // Naujas metodas pažymėjimų atkūrimui
    loadHighlights(savedHighlights) {
        if (savedHighlights) {
            this.savedHighlights = savedHighlights;
        }
    }

    async processText(text, html, savedHighlights = null) {
		console.log(`${this.HIGHLIGHTER_NAME} Pradedamas teksto žymėjimas`);

		try {
			// Naudojame išsaugotus pažymėjimus jei jie yra
			if (savedHighlights) {
				this.loadHighlights(savedHighlights);
			}
			
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

			// Grąžiname rezultatą
			const processedHtml = doc.body.innerHTML;
			
			// Išsaugome pažymėjimus po apdorojimo
			this.saveHighlights();
			
			return processedHtml;
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
			
			// Patikriname ar yra info objektas ir jo turinys
			console.log('Match info:', match.info); // Debuginimui
			
			// Sukuriame meanings masyvą
			const meanings = match.info?.meanings || [{
				"vertimas": match.info?.vertimas || '-',
				"kalbos dalis": match.info?.["kalbos dalis"] || '-',
				"bazinė forma": match.info?.["bazinė forma"] || '-',
				"bazė vertimas": match.info?.["bazė vertimas"] || '-',
				"CERF": match.info?.CERF || '-'
			}];

			// Perduodame į dataset
			span.dataset.info = JSON.stringify({
				text: match.word,
				type: match.type,
				meanings: meanings
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
			const info = JSON.parse(data.replace(/&quot;/g, '"'));
			console.log('Parsed info:', info);
			
			const popup = document.createElement('div');
			popup.className = 'word-info-popup';
			
			// Baziniai stiliai, reikalingi popup veikimui
			popup.style.cssText = `
				position: absolute;
				z-index: 9999;
				display: block;
				visibility: visible;
				opacity: 1;
			`;

			popup.innerHTML = `
				<div class="word-info-container">
					<div class="word-text">${info.text}</div>
					<hr class="thick-divider">
					${info.meanings.map((meaning, index) => `
						${index > 0 ? '<hr class="thin-divider">' : ''}
						<div class="meaning-block">
							${meaning.vertimas ? `<div class="translation">${meaning.vertimas}</div>` : ''}
							${meaning["kalbos dalis"] ? `<div class="part-of-speech">${meaning["kalbos dalis"]}</div>` : ''}
							${meaning["bazinė forma"] ? `
								<div class="base-form">
									${meaning["bazinė forma"]} - ${meaning["bazė vertimas"]}
								</div>
							` : ''}
							${meaning.CERF ? `<div class="cerf">${meaning.CERF}</div>` : ''}
						</div>
					`).join('')}
				</div>
			`;

			const targetRect = event.target.getBoundingClientRect();
			popup.style.left = `${window.scrollX + targetRect.left}px`;
			popup.style.top = `${window.scrollY + targetRect.bottom + 5}px`;

			const rect = event.target.getBoundingClientRect();
			document.body.appendChild(popup);
			this.activePopup = popup;
			this._adjustPopupPosition(popup);

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
		const contentWidth = document.querySelector('.text-content').getBoundingClientRect().width;
		const contentLeft = document.querySelector('.text-content').getBoundingClientRect().left;

		// Horizontalus pozicionavimas
		const maxRight = contentLeft + contentWidth - 10; // 10px tarpas nuo dešinio krašto
		if (rect.right > maxRight) {
			// Jei išeina už teksto dešinio krašto
			const newLeft = maxRight - rect.width;
			popup.style.left = `${Math.max(10, newLeft)}px`;
		}

		// Papildomas patikrinimas dešiniam kraštui
		const updatedRect = popup.getBoundingClientRect();
		if (updatedRect.right > maxRight) {
			// Jei vis dar išeina už ribų, mažiname plotį
			const maxWidth = contentWidth - 20; // 20px tarpas (10px iš abiejų pusių)
			popup.style.maxWidth = `${maxWidth}px`;
			popup.style.left = `${contentLeft + 10}px`; // Pridedame minimalų tarpą nuo kairės
		}

		// Vertikalus pozicionavimas lieka toks pat
		if (rect.bottom > viewportHeight) {
			const top = parseInt(popup.style.top) - rect.height - 30;
			popup.style.top = `${Math.max(10, top)}px`;
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
