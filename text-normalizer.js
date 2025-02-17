/**
 * TextNormalizer - klasė skirta Markdown ir HTML teksto normalizavimui
 */
class TextNormalizer {
  constructor(options = {}) {
    this.NORMALIZER_NAME = options.name || '[TextNormalizer]';
    this.debug = options.debug !== false; // Defaulting to true
    
    this.patterns = {
      sectionBreak: /^[&][ \t]*$/gm,
      emphasis: [/_([^_]+?)_/g, /(?<!\*)\*(?!\*)([^*]+?)\*(?!\*)/g],
      strong: [/__([^_]+?)__/g, /\*\*([^*]+?)\*\*/g],
      headers: /^(#{1,6})\s*(.+)$/gm,
      lists: /^[\s-]*[-+*]\s+/gm,
      blockquotes: /^>\s*(.+)$/gm,
      horizontalRules: /^(?:[-*_]\s*){3,}$/gm,
      codeBlocks: /```([\s\S]*?)```/g,
      inlineCode: /`([^`]+)`/g,
      enDash: /–/g,
      quotes: /[""]/g,         // Tik dvigubos kabutės
      apostrophe: /[']/g,      // Apostrofai
      strongEmphasis: [/\*\*\*([^*]+?)\*\*\*/g],
      chapterTitle: /^#\s(.+)$/m,
      emptyLines: /\n\s*\n/g,
      paragraphs: /([^\n])\n([^\n])/g,
      images: /!\[([^\]]*)\]\([^)]+\)/g,
      htmlImages: /<img[^>]+>/g,
      markdownLinks: /\[([^\]]+)\]\([^\)]+\)/g,
      htmlLinks: /<a[^>]*>([^<]*)<\/a>/g,
      localPaths: /(?:\.\.?\/)*[a-zA-Z0-9_-]+\/[a-zA-Z0-9_\/-]+\.[a-zA-Z0-9]+/g,
      htmlTags: /<[^>]+>/g,
      bareUrls: /(?:https?:\/\/)[^\s)]+/g
    };
  }

  handleSectionBreaks(text) {
    return text.replace(/^[&][ \t]*$/gm, '§SECTION_BREAK§');
  }

  normalizeMarkdown(text) {
    if (!text || typeof text !== 'string') {
        throw new Error('Invalid input: text must be a non-empty string');
    }

    let normalized = text;
    normalized = this.removeUnwantedElements(normalized);
    normalized = this.handleHtmlContent(normalized);
    normalized = this.handleSectionBreaks(normalized);
    normalized = this.handleEmphasis(normalized);
    normalized = this.handleHeaders(normalized);
    normalized = this.handleParagraphsAndSpacing(normalized);
    normalized = this.processBasicElements(normalized);
    normalized = this.normalizeQuotes(normalized);
    normalized = this.normalizeCodeBlocks(normalized);
    normalized = this.handleSpecialSymbols(normalized);
    normalized = this.handleImages(normalized);
    
    return normalized;
  }

  handleHtmlContent(text) {
    let processed = text.replace(this.patterns.htmlLinks, '$1');
    processed = processed.replace(/<img[^>]+alt=["']([^"']+)["'][^>]*>/g, '$1');
    processed = processed.replace(this.patterns.htmlImages, '');
    processed = processed.replace(this.patterns.htmlTags, '');
    return processed;
  }

  removeUnwantedElements(text) {
    return text
      .replace(this.patterns.markdownLinks, '$1')
      .replace(this.patterns.bareUrls, '')
      .replace(this.patterns.localPaths, '')
      .replace(/[ \t]+/g, ' ')
      .split('\n')
      .map(line => line.trim())
      .join('\n');
  }

  handleHeaders(text) {
    let result = text.replace(this.patterns.chapterTitle, '# $1\n\n');
    result = result.replace(this.patterns.headers, '$1 $2\n\n');
    return result;
  }
  
  handleParagraphsAndSpacing(text) {
    return text
      .replace(this.patterns.paragraphs, '$1\n\n$2')
      .replace(/^>\s*(.+)$/gm, '> $1\n\n')
      .replace(/\n{4,}/g, '\n\n\n')
      .trim();
  }

  handleImages(text) {
    return text
      .replace(this.patterns.images, '$1')
      .replace(this.patterns.htmlImages, '');
  }

  processBasicElements(text) {
    return text
      .replace(this.patterns.lists, '* ')
      .replace(this.patterns.horizontalRules, '—');
  }

  handleSpecialSymbols(text) {
    return text
      .replace(this.patterns.quotes, '"')
      .replace(this.patterns.apostrophe, ''')
      .replace(this.patterns.enDash, '-')
      .replace(/\.{3}/g, '…');
  }

  normalizeQuotes(text) {
    return text
      .replace(/^(\s*)(?:&|>+)/gm, '>')
      .replace(this.patterns.blockquotes, '> $1');
  }

  normalizeCodeBlocks(text) {
    return text
      .replace(this.patterns.codeBlocks, (_, code) => `\n\n\`\`\`\n${code.trim()}\n\`\`\`\n\n`)
      .replace(this.patterns.inlineCode, '`$1`');
  }

  handleEmphasis(text) {
    let result = text;
    result = result.replace(this.patterns.strongEmphasis, '___$1___');
    
    this.patterns.strong.forEach(regex => {
      result = result.replace(regex, '__$1__');
    });
    
    this.patterns.emphasis.forEach(regex => {
      result = result.replace(regex, '_$1_');
    });
    
    return result;
  }
}

export { TextNormalizer };
