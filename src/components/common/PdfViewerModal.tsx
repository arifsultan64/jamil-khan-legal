import React, { useState } from 'react';
import { Download, ExternalLink, X, ZoomIn, ZoomOut } from 'lucide-react';
import {
  getDriveDownloadUrl,
  getDrivePreviewUrl,
  getDriveViewUrl,
  isGoogleDriveUrl,
} from '../../utils/driveUrls';

interface PdfViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  pdfUrl: string;
  onDownload?: () => void;
}

export const PdfViewerModal: React.FC<PdfViewerModalProps> = ({
  isOpen,
  onClose,
  title,
  pdfUrl,
  onDownload,
}) => {
  const [zoom, setZoom] = useState(100);

  if (!isOpen || !pdfUrl) return null;

  const isDrive = isGoogleDriveUrl(pdfUrl);
  const isPdf = pdfUrl.toLowerCase().includes('.pdf') || pdfUrl.toLowerCase().includes('application/pdf');
  const canEmbed = isDrive || isPdf;
  const viewerSrc = isDrive ? getDrivePreviewUrl(pdfUrl) : `${pdfUrl}#zoom=${zoom}`;
  const openTabHref = isDrive ? getDriveViewUrl(pdfUrl) : pdfUrl;
  const downloadHref = isDrive ? getDriveDownloadUrl(pdfUrl) : pdfUrl;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex flex-col p-3 md:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={`Document Viewer: ${title}`}
    >
      <div className="bg-white rounded-lg border border-slate-200 flex flex-col w-full max-w-6xl mx-auto h-full overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-slate-200 bg-[#FBF9F5]">
          <div className="min-w-0">
            <h2 className="font-serif text-lg font-semibold text-[#0F2342] truncate">{title}</h2>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {!isDrive && isPdf && (
              <>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(50, z - 25))}
                  className="p-2 text-slate-600 hover:text-[#0F2342] border border-slate-200 rounded-md bg-white cursor-pointer"
                  title="Zoom Out"
                  aria-label="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-xs font-mono tabular-nums text-slate-700 w-12 text-center">
                  {zoom}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(200, z + 25))}
                  className="p-2 text-slate-600 hover:text-[#0F2342] border border-slate-200 rounded-md bg-white cursor-pointer"
                  title="Zoom In"
                  aria-label="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
              </>
            )}

            <a
              href={openTabHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 border border-slate-200 rounded-md bg-white hover:border-[#0F2342] whitespace-nowrap"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Open Tab</span>
            </a>

            <a
              href={downloadHref}
              download
              target={isDrive ? '_blank' : undefined}
              rel={isDrive ? 'noopener noreferrer' : undefined}
              onClick={() => onDownload?.()}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-[#0F2342] rounded-md hover:bg-[#18345E] whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              Download
            </a>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-600 hover:text-red-700 border border-slate-200 rounded-md bg-white cursor-pointer"
              aria-label="Close viewer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 bg-slate-100 overflow-auto">
          {canEmbed ? (
            <iframe
              key={viewerSrc}
              src={viewerSrc}
              title={title}
              allow="autoplay"
              className="w-full h-full border-0"
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center">
              <p className="font-serif text-xl text-[#0F2342] mb-2">Document Ready for Download</p>
              <p className="text-sm text-slate-600 max-w-md mb-6">
                This file format opens natively in Microsoft Office or LibreOffice. Use the download button below to view the complete presentation or handout.
              </p>
              <a
                href={downloadHref}
                download
                onClick={() => onDownload?.()}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-[#0F2342] rounded-md hover:bg-[#18345E]"
              >
                <Download className="w-4 h-4" />
                Download Document
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
