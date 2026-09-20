import { GoogleDriveProvider } from "./google-drive";
import { LocalStorageProvider } from "./local";
import type { StorageProvider } from "./types";

export * from "./types";

const providers = new Map<string, StorageProvider>();

function register(provider: StorageProvider) {
  providers.set(provider.name, provider);
  return provider;
}

const drive = register(new GoogleDriveProvider());
const local = register(new LocalStorageProvider());

/**
 * The provider new uploads are written to.
 * Google Drive when configured; otherwise the local filesystem, so development
 * and tests work without credentials. Set STORAGE_PROVIDER to force one.
 */
export function getStorageProvider(): StorageProvider {
  const forced = process.env.STORAGE_PROVIDER;
  if (forced && providers.has(forced)) return providers.get(forced)!;
  return drive.isConfigured() ? drive : local;
}

/** Look up the provider a stored file was written with (files outlive config changes). */
export function getProviderByName(name: string | null | undefined): StorageProvider | null {
  if (!name) return null;
  return providers.get(name) ?? null;
}

export function storageStatus() {
  return {
    active: getStorageProvider().name,
    googleDriveConfigured: drive.isConfigured(),
  };
}
