import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { generateSafeId } from '../utils/formatters';
import { validateUploadFile } from './storageService';
import { logAdminActivity } from './firestoreService';
import type { MediaAsset } from '../types/portal';

export const GOOGLE_DRIVE_SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.readonly',
] as const;

export const PORTAL_DRIVE_FOLDER_NAME = 'Jameel Khan Portal Media';

const DRIVE_FILES_API = 'https://www.googleapis.com/drive/v3/files';
const DRIVE_UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3/files';
const DRIVE_ABOUT_API = 'https://www.googleapis.com/drive/v3/about';

export interface DriveAccountInfo {
  user: {
    displayName: string;
    emailAddress: string;
    photoLink?: string;
  };
  storageQuota: {
    limitBytes: number;
    usageBytes: number;
    usageInDriveBytes: number;
  };
}

export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  modifiedTime: string;
  webViewLink: string;
  webContentLink?: string;
  thumbnailLink?: string;
  iconLink?: string;
  shared: boolean;
  parents?: string[];
}

export interface DriveFolderInfo {
  id: string;
  name: string;
  webViewLink: string;
}

export class DriveAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DriveAuthError';
  }
}

async function handleDriveResponse(res: Response): Promise<any> {
  if (res.status === 401) {
    throw new DriveAuthError('Google Drive session expired. Please reconnect Google Drive to continue.');
  }
  if (!res.ok) {
    let errMsg = `Google Drive request failed (${res.status})`;
    try {
      const data = await res.json();
      if (data?.error?.message) errMsg = data.error.message;
    } catch {
      // ignore json parse error
    }
    throw new Error(errMsg);
  }
  if (res.status === 204) return null;
  return res.json();
}

export async function getDriveAccountInfo(accessToken: string): Promise<DriveAccountInfo> {
  const res = await fetch(
    `${DRIVE_ABOUT_API}?fields=user(displayName,emailAddress,photoLink),storageQuota(limit,usage,usageInDrive)`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const data = await handleDriveResponse(res);
  return {
    user: {
      displayName: data.user?.displayName || 'Google Account',
      emailAddress: data.user?.emailAddress || '',
      photoLink: data.user?.photoLink,
    },
    storageQuota: {
      limitBytes: Number(data.storageQuota?.limit || 0),
      usageBytes: Number(data.storageQuota?.usage || 0),
      usageInDriveBytes: Number(data.storageQuota?.usageInDrive || 0),
    },
  };
}

export async function ensurePortalDriveFolder(accessToken: string): Promise<DriveFolderInfo> {
  const q = encodeURIComponent(
    `name = '${PORTAL_DRIVE_FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
  );
  const listRes = await fetch(
    `${DRIVE_FILES_API}?q=${q}&fields=files(id,name,webViewLink)&pageSize=5`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const listData = await handleDriveResponse(listRes);
  const existing = listData?.files?.[0];
  if (existing?.id) {
    return {
      id: existing.id,
      name: existing.name || PORTAL_DRIVE_FOLDER_NAME,
      webViewLink: existing.webViewLink || `https://drive.google.com/drive/folders/${existing.id}`,
    };
  }

  const createRes = await fetch(`${DRIVE_FILES_API}?fields=id,name,webViewLink`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: PORTAL_DRIVE_FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
      description: 'Media, images, research papers, judgments, and presentations for Jameel Khan Legal Research Portal.',
    }),
  });
  const created = await handleDriveResponse(createRes);
  return {
    id: created.id,
    name: created.name || PORTAL_DRIVE_FOLDER_NAME,
    webViewLink: created.webViewLink || `https://drive.google.com/drive/folders/${created.id}`,
  };
}

export async function setDriveFilePublicReader(fileId: string, accessToken: string): Promise<void> {
  const res = await fetch(`${DRIVE_FILES_API}/${encodeURIComponent(fileId)}/permissions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      role: 'reader',
      type: 'anyone',
    }),
  });
  await handleDriveResponse(res);
}

export function buildWebsiteUrlForDriveFile(fileId: string, mimeType: string): string {
  if (mimeType.startsWith('image/')) {
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1600`;
  }
  return `https://drive.google.com/file/d/${fileId}/view`;
}

export async function registerDriveFileInMediaLibrary(
  driveFile: Pick<DriveFileItem, 'id' | 'name' | 'mimeType' | 'sizeBytes'>,
  visibility: 'public' | 'private'
): Promise<MediaAsset> {
  const user = auth.currentUser;
  if (!user) throw new Error('Administrator authentication required.');

  const assetId = generateSafeId('drv');
  const ext = (driveFile.name.split('.').pop() || '').toLowerCase().slice(0, 20);
  const downloadUrl = buildWebsiteUrlForDriveFile(driveFile.id, driveFile.mimeType);

  const assetPayload: MediaAsset = {
    id: assetId,
    fileName: driveFile.name.slice(0, 260),
    storagePath: `gdrive:${driveFile.id}`,
    downloadUrl,
    mimeType: (driveFile.mimeType || 'application/octet-stream').slice(0, 120),
    extension: ext,
    sizeBytes: Number(driveFile.sizeBytes || 0),
    visibility,
    uploadedBy: user.uid,
    createdAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'media', assetId), assetPayload);
    await logAdminActivity(
      'upload_google_drive_media',
      `Saved "${assetPayload.fileName}" to Google Drive (${visibility})`,
      'media',
      assetId
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `media/${assetId}`);
  }

  return assetPayload;
}

export async function uploadFileToGoogleDrive(
  file: File,
  visibility: 'public' | 'private',
  maxUploadSizeMb: number,
  accessToken: string,
  onProgress?: (percent: number) => void
): Promise<MediaAsset> {
  const user = auth.currentUser;
  if (!user) throw new Error('Administrator authentication required for uploads.');

  const check = validateUploadFile(file, maxUploadSizeMb);
  if (!check.valid) throw new Error(check.error || 'Invalid file.');

  if (onProgress) onProgress(5);
  const folder = await ensurePortalDriveFolder(accessToken);

  const metadata = {
    name: file.name,
    parents: [folder.id],
    description: `Uploaded via Jameel Khan Legal Research CMS (${visibility})`,
  };

  const boundary = `jk_portal_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const delimiter = `--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;
  const metadataPart =
    `${delimiter}Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${JSON.stringify(metadata)}\r\n` +
    `${delimiter}Content-Type: ${file.type || 'application/octet-stream'}\r\n\r\n`;

  const bodyBlob = new Blob([metadataPart, file, closeDelimiter], {
    type: `multipart/related; boundary=${boundary}`,
  });

  const uploaded = await new Promise<any>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(
      'POST',
      `${DRIVE_UPLOAD_API}?uploadType=multipart&fields=id,name,mimeType,size,webViewLink,webContentLink,thumbnailLink,shared`
    );
    xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
    xhr.setRequestHeader('Content-Type', `multipart/related; boundary=${boundary}`);

    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable && onProgress) {
        const pct = Math.min(92, Math.max(10, Math.round((ev.loaded / ev.total) * 90)));
        onProgress(pct);
      }
    };

    xhr.onload = () => {
      if (xhr.status === 401) {
        reject(new DriveAuthError('Google Drive session expired. Please reconnect Google Drive to continue.'));
        return;
      }
      if (xhr.status < 200 || xhr.status >= 300) {
        let msg = `Google Drive upload failed (${xhr.status})`;
        try {
          const errJson = JSON.parse(xhr.responseText);
          if (errJson?.error?.message) msg = errJson.error.message;
        } catch {
          // ignore
        }
        reject(new Error(msg));
        return;
      }
      try {
        resolve(JSON.parse(xhr.responseText));
      } catch {
        reject(new Error('Invalid response from Google Drive upload.'));
      }
    };

    xhr.onerror = () => reject(new Error('Network error while uploading to Google Drive.'));
    xhr.send(bodyBlob);
  });

  if (visibility === 'public' && uploaded.id) {
    await setDriveFilePublicReader(uploaded.id, accessToken);
  }
  if (onProgress) onProgress(100);

  return registerDriveFileInMediaLibrary(
    {
      id: uploaded.id,
      name: uploaded.name || file.name,
      mimeType: uploaded.mimeType || file.type || 'application/octet-stream',
      sizeBytes: Number(uploaded.size || file.size || 0),
    },
    visibility
  );
}

export async function listGoogleDriveFiles(
  accessToken: string,
  options?: {
    folderId?: string;
    searchQuery?: string;
    mimeFilter?: 'all' | 'images' | 'documents';
    pageSize?: number;
  }
): Promise<DriveFileItem[]> {
  const clauses: string[] = [
    'trashed = false',
    "mimeType != 'application/vnd.google-apps.folder'",
  ];

  if (options?.folderId) {
    clauses.push(`'${options.folderId}' in parents`);
  }
  if (options?.mimeFilter === 'images') {
    clauses.push("mimeType contains 'image/'");
  } else if (options?.mimeFilter === 'documents') {
    clauses.push(
      "(mimeType = 'application/pdf' or mimeType contains 'word' or mimeType contains 'presentation' or mimeType contains 'powerpoint' or mimeType contains 'document')"
    );
  }
  if (options?.searchQuery?.trim()) {
    const safeTerm = options.searchQuery.trim().replace(/'/g, "\\'");
    clauses.push(`name contains '${safeTerm}'`);
  }

  const q = encodeURIComponent(clauses.join(' and '));
  const pageSize = options?.pageSize || 50;
  const fields = encodeURIComponent(
    'files(id,name,mimeType,size,modifiedTime,webViewLink,webContentLink,thumbnailLink,iconLink,shared,parents)'
  );
  const res = await fetch(
    `${DRIVE_FILES_API}?q=${q}&orderBy=modifiedTime desc&pageSize=${pageSize}&fields=${fields}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const data = await handleDriveResponse(res);
  return (data.files || []).map((f: any) => ({
    id: f.id,
    name: f.name,
    mimeType: f.mimeType || 'application/octet-stream',
    sizeBytes: Number(f.size || 0),
    modifiedTime: f.modifiedTime || '',
    webViewLink: f.webViewLink || `https://drive.google.com/file/d/${f.id}/view`,
    webContentLink: f.webContentLink,
    thumbnailLink: f.thumbnailLink,
    iconLink: f.iconLink,
    shared: Boolean(f.shared),
    parents: f.parents,
  }));
}

export async function updateDriveFileContent(
  fileId: string,
  file: File,
  maxUploadSizeMb: number,
  accessToken: string,
  onProgress?: (percent: number) => void
): Promise<DriveFileItem> {
  const check = validateUploadFile(file, maxUploadSizeMb);
  if (!check.valid) throw new Error(check.error || 'Invalid file.');

  return new Promise<DriveFileItem>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(
      'PATCH',
      `${DRIVE_UPLOAD_API}/${encodeURIComponent(fileId)}?uploadType=media&fields=id,name,mimeType,size,modifiedTime,webViewLink,webContentLink,thumbnailLink,shared`
    );
    xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');

    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable && onProgress) {
        onProgress(Math.round((ev.loaded / ev.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status === 401) {
        reject(new DriveAuthError('Google Drive session expired. Please reconnect Google Drive.'));
        return;
      }
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new Error(`Failed to replace file in Google Drive (${xhr.status})`));
        return;
      }
      const f = JSON.parse(xhr.responseText);
      resolve({
        id: f.id,
        name: f.name,
        mimeType: f.mimeType || file.type,
        sizeBytes: Number(f.size || file.size),
        modifiedTime: f.modifiedTime || '',
        webViewLink: f.webViewLink || `https://drive.google.com/file/d/${f.id}/view`,
        webContentLink: f.webContentLink,
        thumbnailLink: f.thumbnailLink,
        shared: Boolean(f.shared),
      });
    };

    xhr.onerror = () => reject(new Error('Network error replacing file in Google Drive.'));
    xhr.send(file);
  });
}

export async function deleteDriveFile(fileId: string, accessToken: string): Promise<void> {
  const res = await fetch(`${DRIVE_FILES_API}/${encodeURIComponent(fileId)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  await handleDriveResponse(res);
}
