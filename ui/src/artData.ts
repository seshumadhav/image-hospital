// Abstract B&W images and philosophical quotes
// Images stored locally in public/images/
// Quotes loaded from public/quotes.txt

// Get list of available abstract images (1-70)
export const getRandomImage = (): string => {
  const imageNum = Math.floor(Math.random() * 70) + 1;
  return `/images/abstract-${imageNum}.jpg`;
};

// Load quotes from quotes.txt file
let quotesCache: Array<{ text: string; author: string }> | null = null;

export const loadQuotes = async (): Promise<Array<{ text: string; author: string }>> => {
  if (quotesCache) {
    return quotesCache;
  }

  try {
    const response = await fetch('/quotes.txt');
    const text = await response.text();
    const lines = text.split('\n').filter(line => line.trim() !== '');
    
    quotesCache = lines.map(line => {
      const [text, author] = line.split('|');
      return { text: text?.trim() || '', author: author?.trim() || 'Unknown' };
    }).filter(q => q.text !== '');

    return quotesCache;
  } catch (error) {
    console.error('Failed to load quotes:', error);
    // Return fallback quotes if file loading fails
    return [
      { text: 'All that we see or seem is but a dream within a dream.', author: 'Edgar Allan Poe' },
      { text: 'Time is the most valuable thing a man can spend.', author: 'Theophrastus' },
    ];
  }
};

export const getRandomQuote = async (): Promise<{ text: string; author: string }> => {
  const quotes = await loadQuotes();
  if (quotes.length === 0) {
    return { text: 'The moment is all there is.', author: 'Eckhart Tolle' };
  }
  return quotes[Math.floor(Math.random() * quotes.length)];
};
