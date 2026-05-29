import * as ImageManipulator from 'expo-image-manipulator';

/**
 * Compress a single image before uploading to Firebase Storage
 * @param {string} uri - Local image URI
 * @param {object} options - Compression options
 * @returns {Promise<{uri: string, error: string|null}>}
 */
export const compressImage = async (uri, options = {}) => {
  const {
    maxWidth = 1024,
    maxHeight = 1024,
    quality = 0.7,
  } = options;

  try {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: maxWidth, height: maxHeight } }],
      {
        compress: quality,
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );
    return { uri: result.uri, error: null };
  } catch (error) {
    return { uri, error: error.message };
  }
};

/**
 * Compress multiple images
 * @param {string[]} uris - Array of local image URIs
 * @returns {Promise<{uris: string[], error: string|null}>}
 */
export const compressImages = async (uris) => {
  try {
    const compressed = [];
    for (const uri of uris) {
      const { uri: compressedUri, error } = await compressImage(uri);
      if (error) {
        console.warn('Image compression warning:', error);
      }
      compressed.push(compressedUri || uri);
    }
    return { uris: compressed, error: null };
  } catch (error) {
    return { uris, error: error.message };
  }
};
