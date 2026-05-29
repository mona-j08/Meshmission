import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Colors from '../../constants/colors';

/**
 * ImagePickerComponent — grid of image thumbnails with add/remove functionality.
 *
 * @param {string[]} images - Array of image URIs
 * @param {function} onImagesChange - Called with updated images array
 * @param {number} [maxImages=5] - Maximum number of images allowed
 * @param {object} [style] - Optional container style override
 */

const ImagePickerComponent = ({ images = [], onImagesChange, maxImages = 5, style }) => {
  const canAddMore = images.length < maxImages;

  const handlePickImages = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please allow access to your photo library to upload images.'
        );
        return;
      }

      const remaining = maxImages - images.length;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        selectionLimit: remaining,
        quality: 0.8,
      });

      if (result.canceled) return;

      const newUris = result.assets.map((asset) => asset.uri);
      const updated = [...images, ...newUris].slice(0, maxImages);
      onImagesChange(updated);
    } catch (error) {
      Alert.alert('Error', 'Failed to pick images. Please try again.');
    }
  };

  const handleRemoveImage = (index) => {
    const updated = images.filter((_, i) => i !== index);
    onImagesChange(updated);
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.grid}>
        {images.map((uri, index) => (
          <View key={`${uri}-${index}`} style={styles.imageWrapper}>
            <Image source={{ uri }} style={styles.thumbnail} />
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleRemoveImage(index)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`Remove image ${index + 1}`}
            >
              <Text style={styles.deleteText}>✕</Text>
            </TouchableOpacity>
          </View>
        ))}

        {canAddMore ? (
          <TouchableOpacity
            style={styles.addButton}
            onPress={handlePickImages}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Add images"
          >
            <Text style={styles.addIcon}>+</Text>
            <Text style={styles.addText}>
              {images.length}/{maxImages}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
};

const THUMB_SIZE = 90;

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  imageWrapper: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: 10,
    overflow: 'hidden',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
    backgroundColor: Colors.mainBackground,
  },
  deleteButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.errorAlert,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 14,
  },
  addButton: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.cardBorder,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.inputBackground,
  },
  addIcon: {
    fontSize: 28,
    color: Colors.primaryButton,
    fontWeight: '300',
    lineHeight: 32,
  },
  addText: {
    fontSize: 10,
    color: Colors.disabledText,
    marginTop: 2,
  },
});

export default ImagePickerComponent;
