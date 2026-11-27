import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { Platform } from 'react-native';

const isWeb = Platform.OS === 'web';

/** Resize a picked photo and return it as base64 JPEG (for upload) plus a display uri. */
export async function resizeToBase64(uri: string, width: number, compress = 0.8) {
  const ref = await ImageManipulator.manipulate(uri).resize({ width }).renderAsync();
  const out = await ref.saveAsync({ base64: true, compress, format: SaveFormat.JPEG });
  return { base64: out.base64 ?? '', uri: out.uri };
}

function dir(name: string) {
  const d = new Directory(Paths.document, name);
  d.create({ intermediates: true, idempotent: true });
  return d;
}

/** Persist a base64 JPEG in the app's private documents folder and return its uri. */
export function saveJpeg(folder: 'wardrobe' | 'renders', id: string, base64: string): string {
  const clean = base64.startsWith('data:') ? base64.split(',', 2)[1] : base64;
  if (isWeb) return `data:image/jpeg;base64,${clean}`; // web preview: keep inline
  const f = new File(dir(folder), `${id}.jpg`);
  f.create({ overwrite: true });
  f.write(clean, { encoding: 'base64' });
  return f.uri;
}

/**
 * Same for a PNG with transparency (background-removed wardrobe pieces).
 * `data` is base64 / a data URI (cut out on the server) or a file:// URI (cut out on the device).
 */
export function savePng(folder: 'wardrobe', id: string, data: string): string {
  if (!isWeb && data.startsWith('file:')) {
    const dest = new File(dir(folder), `${id}-cut.png`);
    if (dest.exists) dest.delete();
    const src = new File(data);
    src.copy(dest);
    try {
      src.delete(); // temporary file from the cutout module
    } catch {}
    return dest.uri;
  }
  const clean = data.startsWith('data:') ? data.split(',', 2)[1] : data;
  if (isWeb) return `data:image/png;base64,${clean}`;
  const f = new File(dir(folder), `${id}-cut.png`);
  f.create({ overwrite: true });
  f.write(clean, { encoding: 'base64' });
  return f.uri;
}

export function deleteLocal(uri: string) {
  if (isWeb || uri.startsWith('data:')) return;
  try {
    new File(uri).delete();
  } catch {}
}
