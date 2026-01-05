import { useState, useEffect, useRef } from 'react';
import { AlertCircle, RefreshCw, ExternalLink, Loader2 } from 'lucide-react';

// Extend iframe attributes to support 'is' property for x-frame-bypass
interface ExtendedIframeAttributes extends React.IframeHTMLAttributes<HTMLIFrameElement> {
  is?: string;
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      iframe: React.DetailedHTMLProps<ExtendedIframeAttributes, HTMLIFrameElement>;
    }
  }
}

export default function AgMarkNetEmbed() {
  const [iframeError, setIframeError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [scriptsLoaded, setScriptsLoaded] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // AgMarkNet URL
  const agmarknetUrl = 'https://agmarknet.gov.in/home';

  useEffect(() => {
    // Load x-frame-bypass scripts
    const loadScripts = async () => {
      try {
        // Check if scripts are already loaded
        if (document.querySelector('script[src*="custom-elements-builtin"]')) {
          setScriptsLoaded(true);
          return;
        }

        // Load polyfill for Safari (Custom Elements Built-in Extends)
        const polyfillScript = document.createElement('script');
        polyfillScript.src = 'https://unpkg.com/@ungap/custom-elements-builtin';
        polyfillScript.async = true;
        
        // Load x-frame-bypass module
        const bypassScript = document.createElement('script');
        bypassScript.type = 'module';
        bypassScript.src = 'https://unpkg.com/x-frame-bypass';
        bypassScript.async = true;

        // Wait for both scripts to load
        await Promise.all([
          new Promise<void>((resolve, reject) => {
            polyfillScript.onload = () => resolve();
            polyfillScript.onerror = () => reject(new Error('Failed to load polyfill'));
            document.head.appendChild(polyfillScript);
          }),
          new Promise<void>((resolve, reject) => {
            bypassScript.onload = () => resolve();
            bypassScript.onerror = () => reject(new Error('Failed to load x-frame-bypass'));
            document.head.appendChild(bypassScript);
          })
        ]);

        // Give a small delay for the custom element to register
        setTimeout(() => {
          setScriptsLoaded(true);
        }, 500);
      } catch (error) {
        console.error('Failed to load x-frame-bypass scripts:', error);
        setIframeError(true);
        setIsLoading(false);
      }
    };

    loadScripts();
  }, []);

  const handleIframeLoad = () => {
    setIsLoading(false);
    setIframeError(false);
  };

  const handleIframeError = () => {
    setIsLoading(false);
    setIframeError(true);
  };

  const handleRefresh = () => {
    setIframeError(false);
    setIsLoading(true);
    if (iframeRef.current) {
      iframeRef.current.src = agmarknetUrl;
    }
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
            <span className="block mt-1 text-xs text-yellow-600 font-medium">
              ⚠️ Educational/Testing Purpose Only - Using x-frame-bypass
            </span>
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
            onClick={handleRefresh}
            disabled={isLoading}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="border-2 border-gray-200 rounded-lg p-12 text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">
            {!scriptsLoaded ? 'Loading x-frame-bypass scripts...' : 'Loading AgMarkNet data...'}
          </p>
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
                The x-frame-bypass method may not work in all browsers or the proxy may be unavailable.
                This is expected behavior for testing purposes.
              </p>
              <div className="space-y-2 mb-4">
                <p className="text-sm font-medium text-red-800">Possible Reasons:</p>
                <ul className="text-sm text-red-600 list-disc list-inside space-y-1">
                  <li>Browser doesn't support Customized Built-in Elements (Safari/Edge)</li>
                  <li>CORS proxy is unavailable or blocked</li>
                  <li>AgMarkNet has additional security measures</li>
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

      {/* Iframe Container with x-frame-bypass */}
      {scriptsLoaded && !iframeError && (
        <div className="relative border-2 border-gray-200 rounded-lg overflow-hidden bg-gray-50">
          <iframe
            ref={iframeRef}
            is="x-frame-bypass"
            src={agmarknetUrl}
            className="w-full"
            style={{
              height: '1200px',
              border: 'none',
              display: isLoading ? 'none' : 'block'
            }}
            title="AgMarkNet Market Data (x-frame-bypass)"
            onLoad={handleIframeLoad}
            onError={handleIframeError}
            loading="lazy"
          />
        </div>
      )}

      {/* Info Footer */}
      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-xs text-yellow-800">
          <strong>⚠️ Educational/Testing Notice:</strong> This component uses x-frame-bypass library 
          for educational purposes only. It may not work in all browsers (Safari/Edge) and relies on 
          a CORS proxy. For production use, please use our integrated Mandi Bhav API components instead.
        </p>
      </div>
    </div>
  );
}
