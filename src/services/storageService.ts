import { deleteObject, getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';
import { deleteDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType, storage } from '../firebase';
import { generateSafeId } from '../utils/formatters';
import type { MediaAsset } from '../types/portal';

const ALLOWED_EXTENSIONS = new Set(['pdf', 'doc', 'docx', 'ppt', 'pptx', 'jpg', 'jpeg', 'png', 'webp']);

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

export interface UploadResult {
  asset: MediaAsset;
}

export function validateUploadFile(file: File, maxUploadSizeMb = 25): { valid: boolean; error?: string; extension: string } {
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return {
      valid: false,
      extension: ext,
      error: `Unsupported file extension ".${ext}". Allowed: PDF, DOC, DOCX, PPT, PPTX, JPG, JPEG, PNG, WebP.`,
    };
  }
  if (file.type && !ALLOWED_MIME_TYPES.has(file.type)) {
    return {
      valid: false,
      extension: ext,
      error: `Blocked unsafe or unsupported MIME type (${file.type}).`,
    };
  }
  const maxBytes = maxUploadSizeMb * 1024 * 1024;
  if (file.size > maxBytes) {
    return {
      valid: false,
      extension: ext,
      error: `File size exceeds the configured ${maxUploadSizeMb} MB upload limit.`,
    };
  }
  return { valid: true, extension: ext };
}

export async function uploadFileToStorage(
  file: File,
  visibility: 'public' | 'private',
  maxUploadSizeMb: number,
  onProgress?: (percent: number) => void
): Promise<MediaAsset> {
  const user = auth.currentUser;
  if (!user) throw new Error('Administrator authentication required for uploads.');

  const check = validateUploadFile(file, maxUploadSizeMb);
  if (!check.valid) throw new Error(check.error || 'Invalid file.');

  const assetId = generateSafeId('med');
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `${visibility}/${assetId}_${safeName}`;
  const storageRef = ref(storage, storagePath);

  const downloadUrl = await new Promise<string>((resolve, reject) => {
    const task = uploadBytesResumable(storageRef, file, {
      contentType: file.type || 'application/octet-stream',
    });

    task.on(
      'state_changed',
      (snapshot) => {
        if (snapshot.totalBytes > 0 && onProgress) {
          onProgress(Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100));
        }
      },
      (err) => {
        reject(
          new Error(
            err.code === 'storage/unauthorized'
              ? 'Firebase Storage upload denied. Ensure Firebase Storage is enabled and firebase/storage.rules are deployed in Firebase Console.'
              : err.message || 'Upload failed.'
          )
        );
      },
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        resolve(url);
      }
    );
  });

  const assetPayload: MediaAsset = {
    id: assetId,
    fileName: file.name.slice(0, 260),
    storagePath,
    downloadUrl,
    mimeType: file.type || 'application/octet-stream',
    extension: check.extension,
    sizeBytes: file.size,
    visibility,
    uploadedBy: user.uid,
    createdAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'media', assetId), assetPayload);
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `media/${assetId}`);
  }

  return assetPayload;
}

export async function deleteMediaAssetAdmin(asset: MediaAsset): Promise<void> {
  if (asset.storagePath && !asset.storagePath.startsWith('gdrive:')) {
    try {
      await deleteObject(ref(storage, asset.storagePath));
    } catch {
      // File may already be removed or external URL
    }
  }
  try {
    await deleteDoc(doc(db, 'media', asset.id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `media/${asset.id}`);
  }
}
