import { requireOptionalNativeModule } from 'expo';

/**
 * On-device background removal for wardrobe photos (free, offline, the photo never leaves the phone).
 *   iOS 17+: Apple Vision foreground instance mask (the "lift subject" feature)
 *   Android: Google ML Kit Subject Segmentation (model delivered by Google Play services)
 * Not available in Expo Go, on the web or in the iOS simulator: then `native` is null.
 */
interface SenseaCutoutNative {
  isAvailable(): boolean;
  /** Returns a file:// URI of a transparent PNG cropped to the garment, or null if nothing was found. */
  removeBackground(uri: string): Promise<string | null>;
}

const native = requireOptionalNativeModule<SenseaCutoutNative>('SenseaCutout');

export function cutoutAvailable(): boolean {
  try {
    return !!native?.isAvailable();
  } catch {
    return false;
  }
}

/** Never throws: any failure means "no cutout", and the caller can fall back to the server. */
export async function removeBackgroundOnDevice(uri: string): Promise<string | null> {
  if (!cutoutAvailable()) return null;
  try {
    return (await native!.removeBackground(uri)) ?? null;
  } catch {
    return null;
  }
}
