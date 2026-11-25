// The two files that let a phone open katekize.com links in the app instead of the browser. They need facts only the
// owner has (Apple Team ID, Android signing fingerprint), read from environment variables; until those are set the
// files answer 404, so nothing wrong is ever published.

export const APP_ID = 'com.katekize.katekize';
const PATHS = ['/heir/invite*', '/heir/join*', '/heir/u*', '/heir/courses/*'];

/** Apple's apple-app-site-association, or null when the Team ID isn't set (10 letters/digits). */
export function appleAssociation(teamId: string | undefined): object | null {
  const id = (teamId ?? '').trim();
  if (!/^[A-Z0-9]{10}$/.test(id)) return null;
  return { applinks: { details: [{ appIDs: [`${id}.${APP_ID}`], components: PATHS.map((p) => ({ '/': p })) }] } };
}

/** Android's assetlinks.json, or null when no valid SHA-256 fingerprint (comma-separated list allowed) is set. */
export function androidAssetLinks(fingerprints: string | undefined): object | null {
  const list = (fingerprints ?? '')
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
  if (!list.length || !list.every((f) => /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(f))) return null;
  return [{ relation: ['delegate_permission/common.handle_all_urls'], target: { namespace: 'android_app', package_name: APP_ID, sha256_cert_fingerprints: list } }];
}
