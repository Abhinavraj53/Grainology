import { useState, useEffect } from 'react';
import { AlertCircle, RefreshCw, ExternalLink } from 'lucide-react';

export default function AgMarkNetEmbed() {
  const [iframeError, setIframeError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // AgMarkNet URL - you can adjust this to target a specific page/section
  const agmarknetUrl = 'https://agmarknet.gov.in/home';

  useEffect(() => {
    // Check if iframe is blocked immediately
    const checkIframeBlocked = () => {
      const timer = setTimeout(() => {
        // If still loading after 2 seconds, likely blocked
        if (isLoading) {
          setIframeError(true);
          setIsLoading(false);
        }
      }, 2000);

      return () => clearTimeout(timer);
    };

    const cleanup = checkIframeBlocked();
    return cleanup;
  }, [isLoading]);

  useEffect(() => {
    // Listen for iframe blocking errors
    const handleMessage = (event: MessageEvent) => {
      // Check if message indicates iframe blocking
      if (event.data && typeof event.data === 'string' && event.data.includes('X-Frame-Options')) {
        setIframeError(true);
        setIsLoading(false);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleIframeLoad = () => {
    setIsLoading(false);
    // Check if iframe actually loaded content or was blocked
    setTimeout(() => {
      const iframe = document.getElementById('agmarknet-iframe') as HTMLIFrameElement;
      if (iframe) {
        try {
          // Try to access iframe content - if blocked, this will throw
          const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
          if (!iframeDoc || iframeDoc.body.innerHTML.includes('X-Frame-Options')) {
            setIframeError(true);
          }
        } catch (e) {
          // Cross-origin error means iframe is blocked
          setIframeError(true);
        }
      }
    }, 1000);
  };

  const handleIframeError = () => {
    setIsLoading(false);
    setIframeError(true);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 mb-1">
            Market Wise Price & Arrival
          </h2>
          <p className="text-gray-600 text-sm">
            MSP (Minimum Support Price) Commodities & Tomato, Onion, Potato
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href={agmarknetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <ExternalLink className="w-4 h-4" />
            Open in New Tab
          </a>
          <button
            onClick={() => {
              setIframeError(false);
              setIsLoading(true);
              // Force iframe reload
              const iframe = document.getElementById('agmarknet-iframe') as HTMLIFrameElement;
              if (iframe) {
                iframe.src = iframe.src;
              }
            }}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="border-2 border-gray-200 rounded-lg p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading AgMarkNet data...</p>
        </div>
      )}

      {/* Error State */}
      {iframeError && !isLoading && (
        <div className="border-2 border-red-200 rounded-lg p-8 bg-red-50">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-red-800 mb-2">
                Unable to Load AgMarkNet
              </h3>
              <p className="text-sm text-red-600 mb-4">
                The AgMarkNet website may have restrictions that prevent embedding in an iframe. 
                This is a common security measure (X-Frame-Options) to prevent clickjacking attacks.
              </p>
              <div className="space-y-2">
                <p className="text-sm font-medium text-red-800">Alternative Options:</p>
                <ul className="text-sm text-red-600 list-disc list-inside space-y-1">
                  <li>Click "Open in New Tab" to view the data directly on AgMarkNet</li>
                  <li>Use our integrated Mandi Bhav component which uses the same data source</li>
                  <li>Contact AgMarkNet to request iframe embedding permissions</li>
                </ul>
              </div>
              <a
                href={agmarknetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-block px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Open AgMarkNet in New Tab
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Iframe Container */}
      {!iframeError && (
        <div className="relative border-2 border-gray-200 rounded-lg overflow-hidden bg-gray-50">
          <iframe
            id="agmarknet-iframe"
            src={agmarknetUrl}
            className="w-full"
            style={{
              height: '1200px', // Adjust height as needed
              border: 'none',
              display: isLoading ? 'none' : 'block'
            }}
            title="AgMarkNet Market Data"
            onLoad={handleIframeLoad}
            onError={handleIframeError}
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
            loading="lazy"
          />
          
          {/* Overlay message if iframe is blocked */}
          {!isLoading && (
            <div 
              className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center"
              style={{ display: 'none' }} // Hidden by default, shown if iframe fails
            >
              <div className="text-center p-8">
                <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                <p className="text-gray-700 mb-4">
                  Iframe embedding is blocked by AgMarkNet
                </p>
                <a
                  href={agmarknetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Open in New Tab
                </a>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Info Footer */}
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-xs text-blue-800">
          <strong>Note:</strong> This component embeds data directly from AgMarkNet.gov.in. 
          If the iframe is blocked, please use the "Open in New Tab" button or check our integrated Mandi Bhav component.
        </p>
      </div>
    </div>
  );
}

