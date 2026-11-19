/**
 * Helpers for extracting Google Drive file IDs and producing reliable
 * browser-embeddable image, preview, and download URLs.
 */

export function extractGoogleDriveFileId(input?: string | null): string | null {
  if (!input) return null;
  const trimmed = input.trim();

  if (trimmed.startsWith('gdrive:')) {
    const id = trimmed.slice('gdrive:'.length).trim();
    return /^[a-zA-Z0-9_-]{10,}$/.test(id) ? id : null;
  }

  // https://drive.google.com/file/d/<ID>/view or /preview
  const filePathMatch = trimmed.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]{10,})/);
  if (filePathMatch?.[1]) return filePathMatch[1];

  // https://drive.google.com/open?id=<ID> or uc?id=<ID> or thumbnail?id=<ID>
  const queryMatch = trimmed.match(/drive\.google\.com\/(?:open|uc|thumbnail)\?[^#]*\bid=([a-zA-Z0-9_-]{10,})/);
  if (queryMatch?.[1]) return queryMatch[1];

  // https://lh3.googleusercontent.com/d/<ID>
  const lh3Match = trimmed.match(/lh3\.googleusercontent\.com\/d\/([a-zA-Z0-9_-]{10,})/);
  if (lh3Match?.[1]) return lh3Match[1];

  return null;
}

export function isGoogleDriveUrl(input?: string | null): boolean {
  return Boolean(extractGoogleDriveFileId(input));
}

export function getDriveImageRenderUrl(url?: string): string {
  if (!url) return '';
  const id = extractGoogleDriveFileId(url);
  if (!id) return url;
  return `https://drive.google.com/thumbnail?id=${id}&sz=w1600`;
}

export function getDriveImageAlternateUrl(url?: string): string | null {
  if (!url) return null;
  const id = extractGoogleDriveFileId(url);
  if (!id) return null;
  return `https://lh3.googleusercontent.com/d/${id}=w1600`;
}

export function getDrivePreviewUrl(url?: string): string {
  if (!url) return '';
  const id = extractGoogleDriveFileId(url);
  if (!id) return url;
  return `https://drive.google.com/file/d/${id}/preview`;
}

export function getDriveViewUrl(url?: string): string {
  if (!url) return '';
  const id = extractGoogleDriveFileId(url);
  if (!id) return url;
  return `https://drive.google.com/file/d/${id}/view`;
}

export function getDriveDownloadUrl(url?: string): string {
  if (!url) return '';
  const id = extractGoogleDriveFileId(url);
  if (!id) return url;
  return `https://drive.google.com/uc?export=download&id=${id}`;
}
