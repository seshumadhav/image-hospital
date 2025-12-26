// Abstract B&W images and philosophical quotes
// Images stored locally in public/images/
// Quotes loaded from public/quotes.txt

// Cache for available images list
let availableImagesCache: string[] | null = null;

// Load list of available abstract images from manifest
const loadAvailableImages = async (): Promise<string[]> => {
  if (availableImagesCache) {
    return availableImagesCache;
  }

  try {
    const response = await fetch('/images/manifest.json');
    const images: string[] = await response.json();
    availableImagesCache = images;
    return images;
  } catch (error) {
    console.error('Failed to load image manifest, using fallback:', error);
    // Fallback: return empty array, will use number-based fallback
    return [];
  }
};

// Get a random abstract image from available files
export const getRandomImage = async (): Promise<string> => {
  const images = await loadAvailableImages();
  
  if (images.length === 0) {
    // Fallback to number-based if manifest fails (try up to 200 images)
    const imageNum = Math.floor(Math.random() * 200) + 1;
    return `/images/image-${String(imageNum).padStart(3, '0')}.jpg`;
  }
  
  const randomIndex = Math.floor(Math.random() * images.length);
  return `/images/${images[randomIndex]}`;
};

// Get random image with retry on error
export const getRandomImageWithFallback = async (maxRetries = 3): Promise<string> => {
  const images = await loadAvailableImages();
  
  if (images.length === 0) {
    // Fallback to number-based (try up to 200 images)
    const imageNum = Math.floor(Math.random() * 200) + 1;
    return `/images/image-${String(imageNum).padStart(3, '0')}.jpg`;
  }
  
  // Try random images from the list
  const tried = new Set<number>();
  
  for (let attempt = 0; attempt < maxRetries && tried.size < images.length; attempt++) {
    let randomIndex: number;
    do {
      randomIndex = Math.floor(Math.random() * images.length);
    } while (tried.has(randomIndex));
    
    tried.add(randomIndex);
    const imagePath = `/images/${images[randomIndex]}`;
    
    try {
      // Preload the image to verify it exists
      await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = resolve;
        img.onerror = reject;
        img.src = imagePath;
        setTimeout(() => reject(new Error('Timeout')), 2000);
      });
      
      return imagePath;
    } catch (error) {
      if (attempt === maxRetries - 1) {
        // Last attempt, return the path anyway
        console.warn('Failed to load image after retries, using:', imagePath);
        return imagePath;
      }
    }
  }
  
  // If all retries failed, return a random one anyway
  const randomIndex = Math.floor(Math.random() * images.length);
  return `/images/${images[randomIndex]}`;
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
