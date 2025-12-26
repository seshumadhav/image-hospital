import React, { useState, useEffect } from 'react';
import { getRandomImage, getRandomImageWithFallback, getRandomQuote } from './artData';

type UploadState = 'idle' | 'uploading' | 'success' | 'error';

interface UploadResponse {
  url: string;
  expiresAtEpochMs: number;
}

interface FrontendConfig {
  frontend?: {
    apiUrl?: string;
  };
}

export const App: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [state, setState] = useState<UploadState>('idle');
  const [response, setResponse] = useState<UploadResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [artImage, setArtImage] = useState<string>('');
  const [quote, setQuote] = useState<{ text: string; author: string } | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [apiUrl, setApiUrl] = useState<string>('');
  const [urlError, setUrlError] = useState<string | null>(null);

  // Check for error in URL query parameters on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const errorParam = urlParams.get('error');
    if (errorParam) {
      setUrlError(decodeURIComponent(errorParam));
      // Clear the error from URL without reloading
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
      // Auto-dismiss after 8 seconds
      const timer = setTimeout(() => {
        setUrlError(null);
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, []);

  // Load configuration from config.json
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const response = await fetch('/config.json');
        const config: FrontendConfig = await response.json();
        // Use config.json apiUrl if available, otherwise fallback to defaults
        const configuredApiUrl = config.frontend?.apiUrl;
        if (configuredApiUrl) {
          setApiUrl(configuredApiUrl);
        } else {
          // Fallback: Use VITE_API_URL env var or defaults
          // In dev mode, use '/api' (Vite proxy) or 'http://localhost:3000' directly
          setApiUrl(import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : '/api'));
        }
      } catch (error) {
        console.warn('Failed to load config.json, using defaults:', error);
        // Fallback: Use VITE_API_URL env var or defaults
        // In dev mode, use '/api' (Vite proxy) or 'http://localhost:3000' directly
        setApiUrl(import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : '/api'));
      }
    };
    loadConfig();
  }, []);

  useEffect(() => {
    // Load abstract art and quote on initial page load
    // Use async function to handle image loading with fallback
    const loadArtAndQuote = async () => {
      try {
        const imagePath = await getRandomImageWithFallback();
        setArtImage(imagePath);
      } catch (error) {
        // Fallback: try again with getRandomImage
        getRandomImage().then(setArtImage).catch(() => {
          // Ultimate fallback: use a default image
          setArtImage('/images/image-001.jpg');
        });
      }
      getRandomQuote().then(setQuote);
    };
    loadArtAndQuote();
  }, []);

  // Update preview when file is selected
  useEffect(() => {
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setFilePreview(null);
    }
  }, [file]);

  const onFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null;
    setFile(selected);
    setResponse(null);
    setError(null);
    setState('idle');
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file || state === 'uploading') {
      return;
    }

    // Wait for config to load before making request
    if (!apiUrl) {
      setError('Configuration not loaded yet. Please try again.');
      setState('error');
      return;
    }

    setState('uploading');
    setError(null);
    setResponse(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      // API URL is loaded from config.json (or fallback to env var/defaults)
      const res = await fetch(`${apiUrl}/upload`, {
        method: 'POST',
        body: formData,
      });

      const body = await res.json().catch(() => null);

      if (!res.ok) {
        const message =
          (body && typeof body.error === 'string' && body.error) ||
          'Upload failed. Please try again.';
        setError(message);
        setState('error');
        return;
      }

      if (!body || typeof body.url !== 'string' || typeof body.expiresAtEpochMs !== 'number') {
        setError('Unexpected response from server.');
        setState('error');
        return;
      }

      // Convert relative URL to absolute URL for display and clipboard
      const imageUrl = body.url.startsWith('http') 
        ? body.url 
        : `${window.location.origin}${body.url}`;

      setResponse({
        url: imageUrl,
        expiresAtEpochMs: body.expiresAtEpochMs,
      });
      setState('success');
    } catch {
      setError('Network error. Please check your connection.');
      setState('error');
    }
  };

  const handleCopyUrl = async () => {
    if (!response?.url) return;
    
    // Try modern Clipboard API first
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(response.url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        return;
      } catch (err) {
        console.warn('Clipboard API failed, trying fallback:', err);
      }
    }
    
    // Fallback: Use execCommand for older browsers or HTTP sites
    try {
      const textArea = document.createElement('textarea');
      textArea.value = response.url;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      
      if (successful) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } else {
        console.error('execCommand copy failed');
        alert('Failed to copy URL. Please select and copy manually.');
      }
    } catch (err) {
      console.error('Fallback copy failed:', err);
      alert('Failed to copy URL. Please select and copy manually.');
    }
  };

  return (
    <div className={`page ${urlError ? 'has-error-banner' : ''}`}>
      {urlError && (
        <div className="error-banner">
          <div className="error-banner-content">
            <span className="error-banner-icon">⚠</span>
            <span className="error-banner-message">{urlError}</span>
            <button
              className="error-banner-close"
              onClick={() => setUrlError(null)}
              aria-label="Close error message"
            >
              ×
            </button>
          </div>
        </div>
      )}
      <header className="page-header">
        <h1 className="page-heading">The Grey Ward</h1>
        <p className="page-caption">Temporary image hosting with automatic expiration</p>
        <p className="page-description" style={{ marginTop: '16px', fontSize: '14px', color: '#888', lineHeight: '1.6' }}>
          Upload images instantly and get shareable links. No registration required.
        </p>
        {/* SEO-optimized hidden text for search engines */}
        <div style={{ position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', border: 0 }}>
          Free temporary image hosting and sharing tool. Upload images instantly and get shareable links that expire automatically. Perfect for quick image sharing, temporary file storage, and anonymous image hosting. No registration required. Temporary image hosting service for instant image uploads and sharing.
        </div>
      </header>
      <main className="page-content">
        <div className="card">
        <p className="subtitle">
          Upload your image.
          <br />
          Your image will be on the server only for 1 minute
        </p>

        <form className="form" onSubmit={onSubmit}>
          <label className="label">
            <span className="label-text">Select an image (JPEG/PNG)</span>
            <input
              type="file"
              accept="image/jpeg,image/png"
              onChange={onFileChange}
            />
          </label>

          <button
            type="submit"
            className="button"
            disabled={!file || state === 'uploading'}
          >
            {state === 'uploading' ? 'Uploading…' : 'Upload'}
          </button>
        </form>

        <div className="art-section">
          {filePreview ? (
            // Show file preview when a file is selected
            <div className="abstract-art">
              <img src={filePreview} alt="Preview" className="art-image" />
            </div>
          ) : (
            // Show abstract art and quote when no file is selected
            <>
              {artImage && (
                <div className="abstract-art">
                  <img 
                    src={artImage} 
                    alt="Abstract art" 
                    className="art-image"
                    onError={async (e) => {
                      // If image fails to load, try a different one
                      console.warn('Image failed to load, trying another:', artImage);
                      try {
                        const newImage = await getRandomImageWithFallback();
                        setArtImage(newImage);
                      } catch (error) {
                        // If all retries fail, try async getRandomImage
                        getRandomImage().then(setArtImage).catch(() => {
                          // Ultimate fallback
                          setArtImage('/images/image-001.jpg');
                        });
                      }
                    }}
                  />
                </div>
              )}
              {quote && (
                <div className="quote-container">
                  <p className="quote">"{quote.text}"</p>
                  <p className="quote-author">— {quote.author}</p>
                </div>
              )}
            </>
          )}
        </div>

        {state === 'success' && response && (
          <div className="result">
            <div className="result-row">
              <span className="result-label">Uploaded Image URL:</span>
              <div className="result-link-container">
                <a
                  href={response.url}
                  className="result-link"
                  target="_blank"
                  rel="noreferrer"
                >
                  {response.url}
                </a>
                <button
                  type="button"
                  className="copy-button"
                  onClick={handleCopyUrl}
                  title="Copy URL"
                >
                  {copied ? (
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M13.5 4.5L6 12L2.5 8.5"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : (
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <rect
                        x="5.5"
                        y="5.5"
                        width="8"
                        height="8"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        fill="none"
                      />
                      <path
                        d="M3.5 10.5V3.5C3.5 2.94772 3.94772 2.5 4.5 2.5H11.5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        fill="none"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>
            <p className="result-note">Valid for 1 minute.</p>
          </div>
        )}

        {state === 'error' && error && (
          <div className="error">
            <p>{error}</p>
          </div>
        )}
        </div>
      </main>
    </div>
  );
};


