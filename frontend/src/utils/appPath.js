const rawPublicUrl = process.env.PUBLIC_URL || '';

function resolveBasePath(publicUrl) {
  if (!publicUrl) return '';
  try {
    const pathname = new URL(publicUrl, window.location.origin).pathname;
    return pathname.replace(/\/+$/, '');
  } catch {
    return publicUrl.replace(/\/+$/, '');
  }
}

export const APP_BASE_PATH = resolveBasePath(rawPublicUrl);

export function toAppPath(path = '/') {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${APP_BASE_PATH}${normalized}`;
}
