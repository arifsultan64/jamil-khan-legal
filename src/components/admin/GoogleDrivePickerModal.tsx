import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check, FileText, FolderOpen, Image as ImageIcon, RefreshCw, Search, Upload, X } from 'lucide-react';
import { usePortal } from '../../contexts/PortalAuthContext';
import {
  buildWebsiteUrlForDriveFile,
  DriveAuthError,
  type DriveFileItem,
  ensurePortalDriveFolder,
  listGoogleDriveFiles,
  registerDriveFileInMediaLibrary,
  setDriveFilePublicReader,
  uploadFileToGoogleDrive,
} from '../../services/googleDriveService';
import { formatBytes, formatDisplayDate } from '../../utils/formatters';
import { FallbackImage } from '../common/FallbackImage';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { GoogleConnectButton } from './GoogleConnectButton';

interface GoogleDrivePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  accept: string;
  visibility: 'public' | 'private';
  initialFilter?: 'all' | 'images' | 'documents';
  onSelected: (info: { url: string; fileName: string; fileSizeBytes: number; fileType: string }) => void;
}

export const GoogleDrivePickerModal: React.FC<GoogleDrivePickerModalProps> = ({
  isOpen,
  onClose,
  accept,
  visibility,
  initialFilter = 'all',
  onSelected,
}) => {
  const { driveAccessToken, connectGoogleDrive, clearDriveToken, settings } = usePortal();
  const [scopeMode, setScopeMode] = useState<'portal' | 'all'>('portal');
  const [mimeFilter, setMimeFilter] = useState<'all' | 'images' | 'documents'>(initialFilter);
  const [searchQuery, setSearchQuery] = useState('');
  const [files, setFiles] = useState<DriveFileItem[]>([]);
  const [portalFolderId, setPortalFolderId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [uploadingPct, setUploadingPct] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [pendingShareFile, setPendingShareFile] = useState<DriveFileItem | null>(null);
  const [sharingBusy, setSharingBusy] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setMimeFilter(initialFilter);
  }, [initialFilter]);

  const loadFiles = useCallback(async () => {
    if (!driveAccessToken || !isOpen) return;
    setLoading(true);
    setErrorMsg('');
    try {
      let folderId = portalFolderId;
      if (scopeMode === 'portal' && !folderId) {
        const folder = await ensurePortalDriveFolder(driveAccessToken);
        folderId = folder.id;
        setPortalFolderId(folder.id);
      }
      const list = await listGoogleDriveFiles(driveAccessToken, {
        folderId: scopeMode === 'portal' ? folderId : undefined,
        searchQuery,
        mimeFilter,
        pageSize: 60,
      });
      setFiles(list);
    } catch (err) {
      if (err instanceof DriveAuthError) {
        clearDriveToken();
      }
      setErrorMsg(err instanceof Error ? err.message : 'Could not load Google Drive files.');
    } finally {
      setLoading(false);
    }
  }, [driveAccessToken, isOpen, portalFolderId, scopeMode, searchQuery, mimeFilter, clearDriveToken]);

  useEffect(() => {
    if (isOpen && driveAccessToken) {
      loadFiles();
    }
  }, [isOpen, driveAccessToken, loadFiles]);

  if (!isOpen) return null;

  const handleConnect = async () => {
    setConnecting(true);
    setErrorMsg('');
    try {
      await connectGoogleDrive();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not connect Google Drive.');
    } finally {
      setConnecting(false);
    }
  };

  const finalizeSelection = async (file: DriveFileItem) => {
    const ext = (file.name.split('.').pop() || '').toUpperCase() || file.mimeType;
    const url = buildWebsiteUrlForDriveFile(file.id, file.mimeType);
    try {
      await registerDriveFileInMediaLibrary(
        { id: file.id, name: file.name, mimeType: file.mimeType, sizeBytes: file.sizeBytes },
        visibility
      );
    } catch {
      // Non-blocking registry sync
    }
    onSelected({
      url,
      fileName: file.name,
      fileSizeBytes: file.sizeBytes,
      fileType: ext,
    });
    onClose();
  };

  const handleChooseFile = async (file: DriveFileItem) => {
    if (visibility === 'public' && !file.shared) {
      setPendingShareFile(file);
      return;
    }
    await finalizeSelection(file);
  };

  const handleConfirmShare = async () => {
    if (!pendingShareFile || !driveAccessToken) return;
    setSharingBusy(true);
    setErrorMsg('');
    try {
      await setDriveFilePublicReader(pendingShareFile.id, driveAccessToken);
      const updated = { ...pendingShareFile, shared: true };
      setPendingShareFile(null);
      await finalizeSelection(updated);
    } catch (err) {
      if (err instanceof DriveAuthError) clearDriveToken();
      setErrorMsg(err instanceof Error ? err.message : 'Failed to update Google Drive sharing permission.');
      setPendingShareFile(null);
    } finally {
      setSharingBusy(false);
    }
  };

  const handleUploadNew = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !driveAccessToken) return;
    setErrorMsg('');
    setUploadingPct(0);
    try {
      const asset = await uploadFileToGoogleDrive(
        file,
        visibility,
        settings.maxUploadSizeMb || 25,
        driveAccessToken,
        setUploadingPct
      );
      onSelected({
        url: asset.downloadUrl,
        fileName: asset.fileName,
        fileSizeBytes: asset.sizeBytes,
        fileType: (asset.extension || '').toUpperCase() || asset.mimeType,
      });
      onClose();
    } catch (err) {
      if (err instanceof DriveAuthError) clearDriveToken();
      setErrorMsg(err instanceof Error ? err.message : 'Upload to Google Drive failed.');
    } finally {
      setUploadingPct(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Google Drive Media Picker"
    >
      <div className="bg-white rounded-lg border border-slate-200 max-w-4xl w-full max-h-[88vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 bg-[#FBF9F5] flex items-center justify-between gap-3">
          <div>
            <h2 className="font-serif text-xl font-bold text-[#0F2342]">Google Drive Media Library</h2>
            <p className="text-xs text-slate-500">
              Select an existing file from Google Drive or upload a new file directly to your Drive storage.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-500 hover:text-red-700 border border-slate-200 rounded bg-white cursor-pointer"
            aria-label="Close Google Drive picker"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {!driveAccessToken ? (
          <div className="p-10 text-center space-y-4">
            <FolderOpen className="w-10 h-10 text-[#0F2342] mx-auto opacity-80" />
            <div className="space-y-1.5 max-w-md mx-auto">
              <h3 className="font-serif text-lg font-bold text-[#0F2342]">Connect Your Google Drive</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Sign in with your administrator Google account to browse, upload, and link files stored in your Google Drive.
              </p>
            </div>
            {errorMsg && <p className="text-xs text-red-700">{errorMsg}</p>}
            <GoogleConnectButton
              onClick={handleConnect}
              disabled={connecting}
              label={connecting ? 'Connecting Google Drive...' : 'Connect Google Drive'}
            />
          </div>
        ) : (
          <>
            {/* Toolbar */}
            <div className="p-4 border-b border-slate-200 space-y-3 bg-white">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setScopeMode('portal')}
                    className={`px-3 py-1.5 text-xs font-medium rounded border cursor-pointer ${
                      scopeMode === 'portal'
                        ? 'bg-[#0F2342] text-white border-[#0F2342]'
                        : 'bg-[#FBF9F5] text-slate-700 border-slate-200'
                    }`}
                  >
                    Portal Folder
                  </button>
                  <button
                    type="button"
                    onClick={() => setScopeMode('all')}
                    className={`px-3 py-1.5 text-xs font-medium rounded border cursor-pointer ${
                      scopeMode === 'all'
                        ? 'bg-[#0F2342] text-white border-[#0F2342]'
                        : 'bg-[#FBF9F5] text-slate-700 border-slate-200'
                    }`}
                  >
                    All My Drive
                  </button>

                  <select
                    value={mimeFilter}
                    onChange={(e) => setMimeFilter(e.target.value as 'all' | 'images' | 'documents')}
                    className="px-2.5 py-1.5 text-xs border border-slate-300 rounded bg-white"
                    aria-label="Filter Drive files by type"
                  >
                    <option value="all">All Files</option>
                    <option value="images">Images Only</option>
                    <option value="documents">PDF &amp; Documents</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={accept}
                    onChange={handleUploadNew}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingPct !== null}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-[#164937] rounded hover:bg-[#103628] cursor-pointer disabled:opacity-50"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    {uploadingPct !== null ? `Uploading ${uploadingPct}%` : 'Upload New to Drive'}
                  </button>
                  <button
                    type="button"
                    onClick={loadFiles}
                    disabled={loading}
                    className="p-1.5 text-slate-600 border border-slate-200 rounded hover:border-[#0F2342] cursor-pointer"
                    title="Refresh Drive files"
                  >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      loadFiles();
                    }
                  }}
                  placeholder="Search files in Google Drive..."
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-md focus:outline-none focus:border-[#0F2342]"
                />
              </div>

              {errorMsg && <p className="text-xs text-red-700">{errorMsg}</p>}
            </div>

            {/* File Grid */}
            <div className="flex-1 overflow-y-auto p-4 bg-[#FBF9F5]">
              {loading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {[1, 2, 3, 4].map((n) => (
                    <div key={n} className="h-40 bg-white border border-slate-200 rounded animate-pulse" />
                  ))}
                </div>
              ) : files.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-500">
                  No matching files found. Upload a new file above or switch to &ldquo;All My Drive&rdquo;.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {files.map((file) => {
                    const isImage = file.mimeType.startsWith('image/');
                    return (
                      <div
                        key={file.id}
                        className="bg-white border border-slate-200 rounded-md overflow-hidden flex flex-col justify-between hover:border-[#0F2342] transition-colors"
                      >
                        <div className="h-32 bg-slate-100 overflow-hidden flex items-center justify-center border-b border-slate-100">
                          {isImage ? (
                            <FallbackImage
                              src={`https://drive.google.com/thumbnail?id=${file.id}&sz=w600`}
                              alt={file.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="flex flex-col items-center gap-1.5 text-slate-500">
                              <FileText className="w-8 h-8 text-[#0F2342]" />
                              <span className="text-[11px] font-mono uppercase">
                                {(file.name.split('.').pop() || 'FILE').slice(0, 8)}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="p-3 space-y-2">
                          <p className="text-xs font-semibold text-[#0F2342] truncate" title={file.name}>
                            {file.name}
                          </p>
                          <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono tabular-nums">
                            <span>{formatBytes(file.sizeBytes)}</span>
                            <span>{file.modifiedTime ? formatDisplayDate(file.modifiedTime) : ''}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleChooseFile(file)}
                            className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#0F2342] rounded hover:bg-[#18345E] cursor-pointer"
                          >
                            {isImage ? <ImageIcon className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                            Use This File
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <ConfirmDialog
        isOpen={Boolean(pendingShareFile)}
        title="Make Google Drive File Public?"
        description={
          pendingShareFile
            ? `"${pendingShareFile.name}" is currently private in your Google Drive. To display or link it on the public website, its Drive sharing permission will be updated to "Anyone with the link can view".`
            : ''
        }
        confirmLabel="Make Public & Use"
        variant="primary"
        busy={sharingBusy}
        onConfirm={handleConfirmShare}
        onCancel={() => setPendingShareFile(null)}
      />
    </div>
  );
};
