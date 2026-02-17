import { useState } from 'react';
import { RefreshCw, Loader2, AlertCircle } from 'lucide-react';

const CEDA_AGMARKNET_URL = 'https://agmarknet.ceda.ashoka.edu.in/';

/** Pixels to hide from the top (filter bar only – keep table headers visible) */
const DEFAULT_HEADER_OFFSET = 100;

interface CedaAgmarknetEmbedProps {
  /** Height of the visible embed area (default 720px for consistent table/chart view) */
  height?: string | number;
  /** Pixels to clip from top to hide site filter bar; lower = table headings fully visible */
  headerOffset?: number;
  /** Show title bar (heading + Refresh only; no Open in New Tab) */
  showTitle?: boolean;
}

export default function CedaAgmarknetEmbed({
  height = '720px',
  headerOffset = DEFAULT_HEADER_OFFSET,
  showTitle = false,
}: CedaAgmarknetEmbedProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const handleLoad = () => {
    setLoading(false);
    setError(false);
  };

  const handleError = () => {
    setLoading(false);
    setError(true);
  };

  const handleRefresh = () => {
    setLoading(true);
    setError(false);
    const iframe = document.getElementById('ceda-agmarknet-iframe') as HTMLIFrameElement | null;
    if (iframe) iframe.src = CEDA_AGMARKNET_URL;
  };

  const containerHeight = typeof height === 'number' ? `${height}px` : height;
  const iframeHeight = `calc(100% + ${headerOffset}px)`;

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {showTitle && (
        <div className="flex items-center justify-end p-3 border-b border-gray-200 bg-gray-50">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm font-medium disabled:opacity-50"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      )}

      {/* Clip container: hide only filter bar; table headings stay visible */}
      <div
        className="relative w-full overflow-hidden bg-gray-100"
        style={{ height: containerHeight, minHeight: 560 }}
      >
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 z-10">
            <Loader2 className="w-10 h-10 animate-spin text-green-600 mb-3" />
            <p className="text-sm text-gray-600">Loading CEDA Agri Market Data…</p>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-red-50 z-10">
            <AlertCircle className="w-12 h-12 text-red-500 mb-3" />
            <p className="text-center text-red-700 font-medium mb-2">Could not load CEDA dashboard</p>
            <p className="text-center text-sm text-red-600 mb-4">
              The page may block embedding. Try again or check your connection.
            </p>
            <button
              type="button"
              onClick={handleRefresh}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Try again
            </button>
          </div>
        )}

        <div
          className="absolute inset-0 overflow-hidden"
          style={{ marginTop: -headerOffset }}
        >
          <iframe
            id="ceda-agmarknet-iframe"
            src={CEDA_AGMARKNET_URL}
            title="CEDA Agri Market Data"
            className="w-full border-0 block"
            style={{
              height: iframeHeight,
              minHeight: `calc(100% + ${headerOffset}px)`,
              pointerEvents: error ? 'none' : 'auto',
            }}
            onLoad={handleLoad}
            onError={handleError}
            loading="lazy"
          />
        </div>

        {/* Overlays: iframe content cannot be changed (cross-origin), so we cover elements with divs on top */}
        {!loading && !error && (
          <>
            {/* Disable chart data controls: Price/Quantity, Timeseries/Heatmap/Bar chart, Compare Data – overlay blocks clicks */}
            {/* <div
              className="absolute right-0 z-10 bg-white/90 border-b border-gray-100"
              style={{
                left: '50%',
                top: '24%',
                width: '50%',
                height: 48,
              }}
              aria-hidden
              title="Chart controls disabled"
            /> */}
            {/* Cover bottom: watermark text + "Download Data" + "Download charts" / "Share Chart" */}
            <div
              className="absolute left-0 right-0 bottom-0 z-10 bg-white border-t border-gray-100"
              style={{ height: 100 }}
              aria-hidden
            />
            {/* Mask chart watermark (CEDA logo) – center of chart; 38% size so logo fully hidden (inspect: keep height 38% not 20%) */}
            {/* <div
              className="absolute z-10 rounded-lg"
              style={{
                left: '66%',
                top: '43%',
                width: '38%',
                height: '20%',
                transform: 'translate(-50%, -50%)',
                background: '#ffffff',
                boxShadow: '0 0 0 1px rgba(0,0,0,0.04)',
                pointerEvents: 'none',
              }}
              aria-hidden
            /> */}
          </>
        )}
      </div>

      <div className="px-4 py-2 bg-gray-50 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          Source: Directorate of Marketing &amp; Inspection (DMI), Ministry of Agriculture and Farmers Welfare, Government of India.
        </p>
      </div>
    </div>
  );
}
