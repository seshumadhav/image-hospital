import React, { useState } from 'react';

type UploadState = 'idle' | 'uploading' | 'success' | 'error';

interface UploadResponse {
  url: string;
  expiresAtEpochMs: number;
}

export const App: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [state, setState] = useState<UploadState>('idle');
  const [response, setResponse] = useState<UploadResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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

    setState('uploading');
    setError(null);
    setResponse(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/upload', {
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

      setResponse({
        url: body.url,
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
    try {
      await navigator.clipboard.writeText(response.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="page">
      <h1 className="page-heading">Grey Ward</h1>
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
    </div>
  );
};


