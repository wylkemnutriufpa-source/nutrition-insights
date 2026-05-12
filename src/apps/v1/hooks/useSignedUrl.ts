/**
 * @deprecated Use useSignedStorageUrl from '@v1/hooks/useSignedStorageUrl' instead.
 * This file re-exports for backward compatibility.
 */
export { useSignedStorageUrl as useSignedUrl, resolveStorageUrl } from "./useSignedStorageUrl";

export async function resolveStorageUrls(
  items: Array<{ path: string | null; bucket?: string }>
): Promise<Array<string | null>> {
  const { resolveStorageUrl: resolve } = await import("./useSignedStorageUrl");
  return Promise.all(items.map((item) => resolve(item.path, item.bucket)));
}
