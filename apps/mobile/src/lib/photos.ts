import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

/** Converts a picked photo to a JPEG no wider than `maxWidth`. */
export async function preparePhoto(asset: ImagePicker.ImagePickerAsset, maxWidth = 1600) {
  const context = ImageManipulator.manipulate(asset.uri);
  if (asset.width > maxWidth) context.resize({ width: maxWidth });
  const image = await context.renderAsync();
  const result = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.8 });
  return result.uri;
}

/**
 * Opens the photo library and returns up to `limit` prepared JPEG uris,
 * or an empty array when the user cancels.
 */
export async function pickPhotos({
  limit,
  maxWidth,
  aspect,
}: {
  limit: number;
  maxWidth?: number;
  /** Single-photo crop ratio, e.g. [1, 1] for avatars. */
  aspect?: [number, number];
}) {
  if (limit <= 0) return [];
  const single = limit === 1;
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: !single,
    selectionLimit: limit,
    allowsEditing: single && Boolean(aspect),
    aspect,
    quality: 1,
  });
  if (result.canceled) return [];
  return Promise.all(result.assets.slice(0, limit).map((asset) => preparePhoto(asset, maxWidth)));
}
