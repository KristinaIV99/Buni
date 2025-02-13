const DEBUG = false;

import { marked } from './vendor/marked.esm.js';
import DOMPurify from './vendor/purify.es.mjs';

export class HtmlConverter {
    constructor() {
        this.APP_NAME = '[HtmlConverter]';
        
        const renderer = new marked.Renderer();
        
        renderer.blockquote = (quote) => {
            return quote;
        };
        
        marked.setOptions({
            breaks: true,
            gfm: true,
            headerIds: false,
            mangle: false,
            sanitize: false,
            smartLists: true,
            smartypants: false,
            pedantic: false,
            renderer: renderer
        });
        
        this.ALLOWED_TAGS = [
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'em', 'strong',
            'p', 'br', 'hr',
            'ul', 'ol', 'li',
            'code', 'pre',
            'div', 'span'
        ];
        
        this.ALLOWED_CLASSES = [
            'dialog', 
            'triple-space', 
            'after-hr', 
            'phrases'
        ];
        
        if (DEBUG) console.log(`${this.APP_NAME} Konstruktorius inicializuotas`);
    }

    async convertToHtml(text) {
        try {
            if (DEBUG) {
                console.log(`${this.APP_NAME} Pradedama konversija į HTML`);
                console.log('Gautas tekstas:', text);
            }
            
            let processed = text.replace(/^[-–]\s(.+)$/gm, '###DIALOG###$1');
            if (DEBUG) console.log('Po dialogų brūkšnių:', processed);
            
            processed = processed.replace(/^—$/gm, '<hr>\n');
            if (DEBUG) console.log('Po horizontalios linijos:', processed);
            
            let html = marked(processed);
            if (DEBUG) console.log('Po marked konversijos:', html);
            
            html = html.replace(/<p>###DIALOG###(.+?)<\/p>/g, '<p class="dialog">– $1</p>');
            if (DEBUG) console.log('Po dialogų grąžinimo:', html);
            
            html = html.replace(/§SECTION_BREAK§/g, '</p><div class="triple-space"></div><p>');
            if (DEBUG) console.log('Po sekcijų skirtukų:', html);
            
            html = html.replace(/<hr>\s*<p>/g, '<hr><p class="after-hr">');
            if (DEBUG) console.log('Po elementų grąžinimo:', html);
            
            html = DOMPurify.sanitize(html, {
                ALLOWED_TAGS: this.ALLOWED_TAGS,
                ALLOWED_CLASSES: this.ALLOWED_CLASSES,
                KEEP_CONTENT: true,
                ALLOW_DATA_ATTR: false,
            });
            
            if (DEBUG) {
                console.log('Po DOMPurify:', html);
                console.log(`${this.APP_NAME} HTML konversija baigta`);
            }
            
            return html;
        } catch (error) {
            console.error(`${this.APP_NAME} Klaida konvertuojant į HTML:`, error);
            throw error;
        }
    }
}
