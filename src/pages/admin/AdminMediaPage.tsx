import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  Copy,
  ExternalLink,
  FileText,
  FolderOpen,
  HardDrive,
  PlusCircle,
  RefreshCw,
  Search,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import { usePortal } from '../../contexts/PortalAuthContext';
import { fetchMediaAssetsAdmin } from '../../services/firestoreService';
import { deleteMediaAssetAdmin } from '../../services/storageService';
import {
  buildWebsiteUrlForDriveFile,
  type DriveAccountInfo,
  DriveAuthError,
  type DriveFileItem,
  type DriveFolderInfo,
  deleteDriveFile,
  ensurePortalDriveFolder,
  getDriveAccountInfo,
  listGoogleDriveFiles,
  registerDriveFileInMediaLibrary,
  setDriveFilePublicReader,
  updateDriveFileContent,
} from '../../services/googleDriveService';
import type { MediaAsset } from '../../types/portal';
import { extractGoogleDriveFileId } from '../../utils/driveUrls';
import { formatBytes, formatDisplayDate } from '../../utils/formatters';
import { usePageSeo } from '../../utils/seo';
import { FileUploadField } from '../../components/admin/FileUploadField';
import { GoogleConnectButton } from '../../components/admin/GoogleConnectButton';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { FallbackImage } from '../../components/common/FallbackImage';

export const AdminMediaPage: React.FC = () => {
  const { driveAccessToken, connectGoogleDrive, clearDriveToken, settings } = usePortal();
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const [copiedId, setCopiedId] = useState('');
  const [activeTab, setActiveTab] = useState<'library' | 'drive'>('library');

  // Google Drive state
  const [driveInfo, setDriveInfo] = useState<DriveAccountInfo | null>(null);
  const [portalFolder, setPortalFolder] = useState<DriveFolderInfo | null>(null);
  const [driveFiles, setDriveFiles] = useState<DriveFileItem[]>([]);
  const [driveScope, setDriveScope] = useState<'portal' | 'all'>('portal');
  const [driveSearch, setDriveSearch] = useState('');
  const [driveLoading, setDriveLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Confirm dialogs for destructive/mutating operations
  const [deleteTarget, setDeleteTarget] = useState<
    { kind: 'asset'; asset: MediaAsset; alsoDeleteDrive: boolean } | { kind: 'drive'; file: DriveFileItem } | null
  >(null);
  const [replaceTarget, setReplaceTarget] = useState<{ fileId: string; fileName: string; newFile: File } | null>(null);
  const [shareTarget, setShareTarget] = useState<DriveFileItem | null>(null);
  const [dialogBusy, setDialogBusy] = useState(false);

  const replaceInputRef = useRef<HTMLInputElement | null>(null);
  const pendingReplaceTargetRef = useRef<{ fileId: string; fileName: string } | null>(null);

  usePageSeo({
    title: 'Google Drive & Media Library | Admin CMS',
    description: 'Save, browse, replace, and manage images, PDFs, presentations, and documents in Google Drive.',
    canonicalPath: '/admin/media',
  });

  const loadAssets = useCallback(async () => {
    const list = await fetchMediaAssetsAdmin();
    setAssets(list);
  }, []);

  const loadDriveWorkspace = useCallback(async () => {
    if (!driveAccessToken) return;
    setDriveLoading(true);
    setErrorMsg('');
    try {
      const [info, folder] = await Promise.all([
        getDriveAccountInfo(driveAccessToken),
        ensurePortalDriveFolder(driveAccessToken),
      ]);
      setDriveInfo(info);
      setPortalFolder(folder);
      const files = await listGoogleDriveFiles(driveAccessToken, {
        folderId: driveScope === 'portal' ? folder.id : undefined,
        searchQuery: driveSearch,
        pageSize: 60,
      });
      setDriveFiles(files);
    } catch (err) {
      if (err instanceof DriveAuthError) {
        clearDriveToken();
      }
      setErrorMsg(err instanceof Error ? err.message : 'Unable to load Google Drive files.');
    } finally {
      setDriveLoading(false);
    }
  }, [driveAccessToken, driveScope, driveSearch, clearDriveToken]);

  useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  useEffect(() => {
    if (driveAccessToken) {
      loadDriveWorkspace();
    } else {
      setDriveInfo(null);
      setDriveFiles([]);
    }
  }, [driveAccessToken, loadDriveWorkspace]);

  const handleConnectDrive = async () => {
    setConnecting(true);
    setErrorMsg('');
    setStatusMsg('');
    try {
      await connectGoogleDrive();
      setStatusMsg('Google Drive connected. All new uploads now save directly to your Google Drive storage.');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not connect Google Drive.');
    } finally {
      setConnecting(false);
    }
  };

  const handleCopy = async (id: string, url: string) => {
    await navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(''), 1500);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDialogBusy(true);
    setErrorMsg('');
    try {
      if (deleteTarget.kind === 'asset') {
        const driveId = extractGoogleDriveFileId(deleteTarget.asset.storagePath || deleteTarget.asset.downloadUrl);
        if (deleteTarget.alsoDeleteDrive && driveId && driveAccessToken) {
          await deleteDriveFile(driveId, driveAccessToken);
        }
        await deleteMediaAssetAdmin(deleteTarget.asset);
        await loadAssets();
        if (driveAccessToken) await loadDriveWorkspace();
        setStatusMsg(`Removed "${deleteTarget.asset.fileName}" from Website Media Library.`);
      } else {
        if (!driveAccessToken) throw new Error('Connect Google Drive to delete Drive files.');
        await deleteDriveFile(deleteTarget.file.id, driveAccessToken);
        await loadDriveWorkspace();
        setStatusMsg(`Deleted "${deleteTarget.file.name}" from Google Drive.`);
      }
      setDeleteTarget(null);
    } catch (err) {
      if (err instanceof DriveAuthError) clearDriveToken();
      setErrorMsg(err instanceof Error ? err.message : 'Failed to delete file.');
    } finally {
      setDialogBusy(false);
    }
  };

  const triggerReplaceFile = (fileId: string, fileName: string) => {
    pendingReplaceTargetRef.current = { fileId, fileName };
    replaceInputRef.current?.click();
  };

  const handleReplaceFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFile = e.target.files?.[0];
    const target = pendingReplaceTargetRef.current;
    if (replaceInputRef.current) replaceInputRef.current.value = '';
    if (!newFile || !target) return;
    setReplaceTarget({ fileId: target.fileId, fileName: target.fileName, newFile });
  };

  const handleConfirmReplace = async () => {
    if (!replaceTarget || !driveAccessToken) return;
    setDialogBusy(true);
    setErrorMsg('');
    try {
      await updateDriveFileContent(
        replaceTarget.fileId,
        replaceTarget.newFile,
        settings.maxUploadSizeMb || 25,
        driveAccessToken
      );
      setStatusMsg(`Updated "${replaceTarget.fileName}" in Google Drive. Website links remain automatically updated.`);
      setReplaceTarget(null);
      await loadDriveWorkspace();
    } catch (err) {
      if (err instanceof DriveAuthError) clearDriveToken();
      setErrorMsg(err instanceof Error ? err.message : 'Failed to replace file in Google Drive.');
    } finally {
      setDialogBusy(false);
    }
  };

  const handleLinkDriveFileToWebsite = async (file: DriveFileItem) => {
    if (!file.shared) {
      setShareTarget(file);
      return;
    }
    try {
      await registerDriveFileInMediaLibrary(file, 'public');
      await loadAssets();
      setStatusMsg(`Added "${file.name}" to Website Media Library.`);
      setActiveTab('library');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not register Drive file.');
    }
  };

  const handleConfirmMakePublicAndLink = async () => {
    if (!shareTarget || !driveAccessToken) return;
    setDialogBusy(true);
    setErrorMsg('');
    try {
      await setDriveFilePublicReader(shareTarget.id, driveAccessToken);
      await registerDriveFileInMediaLibrary(shareTarget, 'public');
      setStatusMsg(`Shared "${shareTarget.name}" as public reader and linked it to Website Media Library.`);
      setShareTarget(null);
      await Promise.all([loadAssets(), loadDriveWorkspace()]);
    } catch (err) {
      if (err instanceof DriveAuthError) clearDriveToken();
      setErrorMsg(err instanceof Error ? err.message : 'Failed to update sharing permission.');
    } finally {
      setDialogBusy(false);
    }
  };

  const quotaPercent =
    driveInfo && driveInfo.storageQuota.limitBytes > 0
      ? Math.min(100, Math.round((driveInfo.storageQuota.usageBytes / driveInfo.storageQuota.limitBytes) * 100))
      : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="font-serif text-3xl font-bold text-[#0F2342]">
            Google Drive &amp; Media Library
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Save images, PDFs, presentations, and Word documents directly to your Google Drive storage and link them across the website.
          </p>
        </div>

        {driveAccessToken && portalFolder && (
          <a
            href={portalFolder.webViewLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-[#0F2342] bg-white border border-slate-300 rounded-md hover:border-[#0F2342]"
          >
            <FolderOpen className="w-4 h-4 text-[#164937]" />
            Open &ldquo;{portalFolder.name}&rdquo; in Drive
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>

      {/* Google Drive Connection & Storage Quota Card */}
      <div className="bg-white border border-slate-200 rounded-md p-6">
        {!driveAccessToken ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#0F2342]">
                <HardDrive className="w-4 h-4 text-[#164937]" />
                Link Google Drive Storage
              </div>
              <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
                Connect your Google account so all uploaded images and publication files save directly to your Google Drive folder and stay easy to update anytime.
              </p>
            </div>
            <GoogleConnectButton
              onClick={handleConnectDrive}
              disabled={connecting}
              label={connecting ? 'Connecting Google Drive...' : 'Connect Google Drive'}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-6 space-y-1">
              <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#164937]">
                <CheckCircle2 className="w-4 h-4" />
                Google Drive Connected
              </div>
              <p className="text-sm font-semibold text-[#0F2342]">
                {driveInfo?.user.displayName || 'Administrator Account'}{' '}
                {driveInfo?.user.emailAddress && (
                  <span className="font-normal text-slate-500">({driveInfo.user.emailAddress})</span>
                )}
              </p>
              <p className="text-xs text-slate-500">
                Portal storage folder: <strong className="text-slate-700">{portalFolder?.name || 'Jameel Khan Portal Media'}</strong>
              </p>
            </div>

            <div className="lg:col-span-4 space-y-1.5">
              {driveInfo ? (
                <>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600">Google Drive Storage</span>
                    <span className="font-mono text-slate-700 tabular-nums">
                      {formatBytes(driveInfo.storageQuota.usageBytes)} /{' '}
                      {driveInfo.storageQuota.limitBytes > 0 ? formatBytes(driveInfo.storageQuota.limitBytes) : 'Unlimited'}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                    <div className="h-full bg-[#164937]" style={{ width: `${quotaPercent}%` }} />
                  </div>
                </>
              ) : (
                <span className="text-xs text-slate-400">Checking Drive quota...</span>
              )}
            </div>

            <div className="lg:col-span-2 flex lg:justify-end">
              <button
                type="button"
                onClick={loadDriveWorkspace}
                disabled={driveLoading}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 border border-slate-300 rounded-md hover:border-[#0F2342] cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${driveLoading ? 'animate-spin' : ''}`} />
                Sync Drive
              </button>
            </div>
          </div>
        )}
      </div>

      {statusMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-xs text-[#103628] rounded-md">
          {statusMsg}
        </div>
      )}
      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-200 text-xs text-red-800 rounded-md">
          {errorMsg}
        </div>
      )}

      {/* Upload Box */}
      <div className="bg-white border border-slate-200 rounded-md p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <UploadCloud className="w-4 h-4 text-[#0F2342]" />
            <span className="text-sm font-semibold text-[#0F2342]">Upload New File to Google Drive</span>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-xs font-semibold text-slate-700">Visibility:</span>
            <label className="inline-flex items-center gap-1.5 text-xs cursor-pointer">
              <input type="radio" checked={visibility === 'public'} onChange={() => setVisibility('public')} />
              Public (Website Images &amp; Published PDFs)
            </label>
            <label className="inline-flex items-center gap-1.5 text-xs cursor-pointer">
              <input type="radio" checked={visibility === 'private'} onChange={() => setVisibility('private')} />
              Private / Draft Only
            </label>
          </div>
        </div>

        <FileUploadField
          label="Select Image or Document (PDF, DOC, DOCX, PPT, PPTX, JPG, PNG, WebP)"
          accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png,.webp"
          visibility={visibility}
          onUploaded={(info) => {
            setStatusMsg(`Saved "${info.fileName}" to Google Drive and updated Website Media Library.`);
            loadAssets();
            if (driveAccessToken) loadDriveWorkspace();
          }}
        />
      </div>

      {/* Tabs: Website Media Registry vs Live Google Drive Browser */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('library')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px cursor-pointer ${
            activeTab === 'library'
              ? 'border-[#0F2342] text-[#0F2342]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Website Media Library ({assets.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('drive')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px cursor-pointer ${
            activeTab === 'drive'
              ? 'border-[#0F2342] text-[#0F2342]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Google Drive Browser {driveAccessToken ? `(${driveFiles.length})` : ''}
        </button>
      </div>

      <input
        ref={replaceInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png,.webp"
        onChange={handleReplaceFileSelected}
        className="hidden"
      />

      {activeTab === 'library' ? (
        <div className="bg-white border border-slate-200 rounded-md overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#F8FAFC] border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">File</th>
                <th className="px-4 py-3">Storage</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Size</th>
                <th className="px-4 py-3">Visibility</th>
                <th className="px-4 py-3">Uploaded</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {assets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    No files uploaded yet. Upload a file above to store it on your Google Drive.
                  </td>
                </tr>
              ) : (
                assets.map((asset) => {
                  const driveId = extractGoogleDriveFileId(asset.storagePath || asset.downloadUrl);
                  const isImage = asset.mimeType.startsWith('image/');
                  return (
                    <tr key={asset.id}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3 max-w-xs">
                          <div className="w-10 h-10 rounded border border-slate-200 bg-slate-50 overflow-hidden shrink-0 flex items-center justify-center">
                            {isImage ? (
                              <FallbackImage
                                src={asset.downloadUrl}
                                alt={asset.fileName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <FileText className="w-4 h-4 text-[#0F2342]" />
                            )}
                          </div>
                          <span className="font-medium text-[#0F2342] truncate">{asset.fileName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">
                        {driveId ? 'Google Drive' : 'External / Legacy'}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs uppercase">{asset.extension || asset.mimeType}</td>
                      <td className="px-4 py-3 font-mono text-xs tabular-nums">{formatBytes(asset.sizeBytes)}</td>
                      <td className="px-4 py-3 text-xs capitalize">{asset.visibility}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500 tabular-nums">
                        {formatDisplayDate(asset.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleCopy(asset.id, asset.downloadUrl)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs border border-slate-200 rounded mr-1.5 cursor-pointer hover:border-[#0F2342]"
                        >
                          <Copy className="w-3 h-3" />
                          {copiedId === asset.id ? 'Copied' : 'Copy URL'}
                        </button>
                        {driveId && driveAccessToken && (
                          <button
                            type="button"
                            onClick={() => triggerReplaceFile(driveId, asset.fileName)}
                            className="inline-flex items-center px-2.5 py-1 text-xs border border-slate-200 rounded mr-1.5 cursor-pointer hover:border-[#0F2342]"
                            title="Replace file contents in Google Drive"
                          >
                            Replace
                          </button>
                        )}
                        <a
                          href={asset.downloadUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center p-1.5 text-slate-600 hover:text-[#0F2342] mr-1"
                          title="Open"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                        <button
                          type="button"
                          onClick={() =>
                            setDeleteTarget({
                              kind: 'asset',
                              asset,
                              alsoDeleteDrive: Boolean(driveId && driveAccessToken),
                            })
                          }
                          className="inline-flex items-center p-1.5 text-red-700 hover:text-red-900 cursor-pointer"
                          title="Delete File"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-md p-5 space-y-4">
          {!driveAccessToken ? (
            <div className="py-10 text-center space-y-3">
              <p className="text-sm text-slate-600">
                Connect your Google Drive account above to browse and manage files directly from Drive.
              </p>
              <GoogleConnectButton
                onClick={handleConnectDrive}
                disabled={connecting}
                label={connecting ? 'Connecting...' : 'Connect Google Drive'}
              />
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setDriveScope('portal')}
                    className={`px-3 py-1.5 text-xs font-medium rounded border cursor-pointer ${
                      driveScope === 'portal'
                        ? 'bg-[#0F2342] text-white border-[#0F2342]'
                        : 'bg-[#FBF9F5] text-slate-700 border-slate-200'
                    }`}
                  >
                    Portal Folder
                  </button>
                  <button
                    type="button"
                    onClick={() => setDriveScope('all')}
                    className={`px-3 py-1.5 text-xs font-medium rounded border cursor-pointer ${
                      driveScope === 'all'
                        ? 'bg-[#0F2342] text-white border-[#0F2342]'
                        : 'bg-[#FBF9F5] text-slate-700 border-slate-200'
                    }`}
                  >
                    All My Google Drive
                  </button>
                </div>

                <div className="relative flex-1 max-w-sm">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="search"
                    value={driveSearch}
                    onChange={(e) => setDriveSearch(e.target.value)}
                    placeholder="Filter Drive files by name..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-md"
                  />
                </div>
              </div>

              {driveLoading ? (
                <div className="py-10 text-center text-sm text-slate-500">Loading Google Drive files...</div>
              ) : driveFiles.length === 0 ? (
                <div className="py-10 text-center text-sm text-slate-500">
                  No files found in this Drive view.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {driveFiles.map((file) => {
                    const isImage = file.mimeType.startsWith('image/');
                    const websiteUrl = buildWebsiteUrlForDriveFile(file.id, file.mimeType);
                    return (
                      <div
                        key={file.id}
                        className="border border-slate-200 rounded-md overflow-hidden flex flex-col justify-between bg-[#FBF9F5]"
                      >
                        <div className="h-36 bg-slate-100 border-b border-slate-200 flex items-center justify-center overflow-hidden">
                          {isImage ? (
                            <FallbackImage
                              src={`https://drive.google.com/thumbnail?id=${file.id}&sz=w600`}
                              alt={file.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <FileText className="w-8 h-8 text-[#0F2342]" />
                          )}
                        </div>
                        <div className="p-3.5 bg-white space-y-2.5 flex-1 flex flex-col justify-between">
                          <div>
                            <p className="text-xs font-semibold text-[#0F2342] truncate" title={file.name}>
                              {file.name}
                            </p>
                            <p className="text-[11px] font-mono text-slate-500 mt-0.5 tabular-nums">
                              {formatBytes(file.sizeBytes)} · {file.shared ? 'Public link' : 'Private'}
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            <button
                              type="button"
                              onClick={() => handleLinkDriveFileToWebsite(file)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-white bg-[#164937] rounded hover:bg-[#103628] cursor-pointer"
                            >
                              <PlusCircle className="w-3 h-3" />
                              Add to Library
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCopy(file.id, websiteUrl)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs border border-slate-200 rounded cursor-pointer"
                            >
                              <Copy className="w-3 h-3" />
                              {copiedId === file.id ? 'Copied' : 'URL'}
                            </button>
                            <button
                              type="button"
                              onClick={() => triggerReplaceFile(file.id, file.name)}
                              className="px-2.5 py-1 text-xs border border-slate-200 rounded cursor-pointer"
                            >
                              Replace
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget({ kind: 'drive', file })}
                              className="p-1 text-red-700 hover:text-red-900 cursor-pointer ml-auto"
                              title="Delete from Google Drive"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title={
          deleteTarget?.kind === 'drive'
            ? 'Delete File from Google Drive?'
            : 'Remove Media File?'
        }
        description={
          deleteTarget?.kind === 'drive'
            ? `Are you sure you want to permanently delete "${deleteTarget.file.name}" from your Google Drive? Any website publications referencing it will lose access.`
            : deleteTarget?.kind === 'asset'
            ? deleteTarget.alsoDeleteDrive
              ? `Remove "${deleteTarget.asset.fileName}" from the Website Media Library and permanently delete the underlying file from your Google Drive?`
              : `Remove "${deleteTarget.asset.fileName}" from the Website Media Library?`
            : ''
        }
        confirmLabel="Confirm Delete"
        variant="danger"
        busy={dialogBusy}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Replace File Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(replaceTarget)}
        title="Overwrite Google Drive File?"
        description={
          replaceTarget
            ? `Replace the contents of "${replaceTarget.fileName}" in Google Drive with "${replaceTarget.newFile.name}" (${formatBytes(replaceTarget.newFile.size)})? Existing website links to this file will automatically serve the updated version.`
            : ''
        }
        confirmLabel="Replace File"
        variant="primary"
        busy={dialogBusy}
        onConfirm={handleConfirmReplace}
        onCancel={() => setReplaceTarget(null)}
      />

      {/* Make Public & Link Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(shareTarget)}
        title="Share Google Drive File Publicly?"
        description={
          shareTarget
            ? `"${shareTarget.name}" is currently private in your Google Drive. Update its Google Drive permission to "Anyone with the link can view" so website visitors can access it?`
            : ''
        }
        confirmLabel="Make Public & Link"
        variant="primary"
        busy={dialogBusy}
        onConfirm={handleConfirmMakePublicAndLink}
        onCancel={() => setShareTarget(null)}
      />
    </div>
  );
};
