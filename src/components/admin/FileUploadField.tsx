import React, { useRef, useState } from 'react';
import { CheckCircle2, FileCheck2, FolderOpen, Trash2, Upload } from 'lucide-react';
import { usePortal } from '../../contexts/PortalAuthContext';
import { DriveAuthError, uploadFileToGoogleDrive } from '../../services/googleDriveService';
import { formatBytes } from '../../utils/formatters';
import { GoogleConnectButton } from './GoogleConnectButton';
import { GoogleDrivePickerModal } from './GoogleDrivePickerModal';

interface FileUploadFieldProps {
  label: string;
  accept: string;
  visibility?: 'public' | 'private';
  valueUrl?: string;
  fileName?: string;
  fileSizeBytes?: number;
  fileType?: string;
  onUploaded: (info: { url: string; fileName: string; fileSizeBytes: number; fileType: string }) => void;
  onClear?: () => void;
}

export const FileUploadField: React.FC<FileUploadFieldProps> = ({
  label,
  accept,
  visibility = 'public',
  valueUrl,
  fileName,
  fileSizeBytes,
  fileType,
  onUploaded,
  onClear,
}) => {
  const { settings, driveAccessToken, connectGoogleDrive, clearDriveToken } = usePortal();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const isImageField =
    accept.includes('.jpg') || accept.includes('.png') || accept.includes('.webp') || accept.includes('.ico');

  const uploadFile = async (file: File, token: string) => {
    setError('');
    setProgress(0);
    try {
      const asset = await uploadFileToGoogleDrive(
        file,
        visibility,
        settings.maxUploadSizeMb || 25,
        token,
        setProgress
      );
      onUploaded({
        url: asset.downloadUrl,
        fileName: asset.fileName,
        fileSizeBytes: asset.sizeBytes,
        fileType: (asset.extension || '').toUpperCase() || asset.mimeType,
      });
    } catch (err) {
      if (err instanceof DriveAuthError) {
        clearDriveToken();
      }
      setError(err instanceof Error ? err.message : 'Google Drive upload failed.');
    } finally {
      setProgress(null);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');

    let token = driveAccessToken;
    if (!token) {
      try {
        setConnecting(true);
        token = await connectGoogleDrive();
      } catch (err) {
        setConnecting(false);
        if (inputRef.current) inputRef.current.value = '';
        setError(
          err instanceof Error
            ? err.message
            : 'Please connect Google Drive first so files save directly to your Drive storage.'
        );
        return;
      } finally {
        setConnecting(false);
      }
    }

    await uploadFile(file, token);
  };

  const handleConnectClick = async () => {
    setConnecting(true);
    setError('');
    try {
      await connectGoogleDrive();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not connect Google Drive.');
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="block text-xs font-semibold text-slate-700">{label}</label>
        {driveAccessToken ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#164937]">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Google Drive Linked
          </span>
        ) : (
          <GoogleConnectButton
            compact
            onClick={handleConnectClick}
            disabled={connecting}
            label={connecting ? 'Connecting...' : 'Connect Google Drive'}
          />
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={valueUrl || ''}
          onChange={(e) =>
            onUploaded({
              url: e.target.value,
              fileName: fileName || 'External Resource',
              fileSizeBytes: fileSizeBytes || 0,
              fileType: fileType || 'LINK',
            })
          }
          placeholder="Upload to Google Drive, pick from Drive, or paste URL..."
          className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-md bg-white focus:outline-none focus:border-[#0F2342]"
        />

        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={progress !== null || connecting}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-[#0F2342] rounded-md hover:bg-[#18345E] whitespace-nowrap disabled:opacity-50 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            {progress !== null
              ? `Uploading ${progress}%`
              : connecting
              ? 'Linking...'
              : valueUrl
              ? 'Upload New'
              : 'Upload to Drive'}
          </button>

          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-[#0F2342] bg-[#F4F0E8] border border-slate-300 rounded-md hover:border-[#0F2342] whitespace-nowrap cursor-pointer"
            title="Select an existing file from your Google Drive"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            Browse Drive
          </button>

          {valueUrl && onClear && (
            <button
              type="button"
              onClick={onClear}
              className="inline-flex items-center justify-center px-2.5 py-2 text-xs font-medium text-red-700 bg-white border border-slate-300 rounded-md hover:border-red-400 cursor-pointer"
              title="Remove attachment"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {progress !== null && (
        <div className="w-full h-1.5 bg-slate-200 rounded overflow-hidden">
          <div className="h-full bg-[#164937] transition-all" style={{ width: `${progress}%` }} />
        </div>
      )}

      {valueUrl && (
        <div className="flex items-center gap-2 text-xs text-[#164937] bg-emerald-50/70 border border-emerald-200 rounded px-3 py-1.5">
          <FileCheck2 className="w-4 h-4 shrink-0" />
          <span className="truncate font-medium">{fileName || valueUrl}</span>
          {fileSizeBytes ? (
            <span className="font-mono text-[11px] text-slate-600 shrink-0 tabular-nums">
              ({fileType} · {formatBytes(fileSizeBytes)})
            </span>
          ) : null}
        </div>
      )}

      {error && <p className="text-xs text-red-700">{error}</p>}

      <GoogleDrivePickerModal
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        accept={accept}
        visibility={visibility}
        initialFilter={isImageField ? 'images' : 'documents'}
        onSelected={onUploaded}
      />
    </div>
  );
};
