/**
 * MeshMission — Firebase Storage Service
 *
 * Rewritten to support robust compressed uploads (BUG 9), transactional multi-uploads
 * with automatic deletion rollback, hard deletion of donation directories, and profile photo uploads.
 */

import { ref, uploadBytesResumable, getDownloadURL, listAll, deleteObject } from 'firebase/storage';
import { storage } from './config';
import { compressImage } from '../utils/imageCompressor';

/**
 * Upload a single image (compressed)
 */
export const uploadImage = async (uri, path, onProgress) => {
  try {
    // BUG 9: Compress image before uploading (max 800px, 0.7 quality)
    const compressionResult = await compressImage(uri, {
      maxWidth: 800,
      maxHeight: 800,
      quality: 0.7,
    });
    
    const finalUri = compressionResult?.uri || uri;
    const response = await fetch(finalUri);
    const blob = await response.blob();
    const storageRef = ref(storage, path);
    const uploadTask = uploadBytesResumable(storageRef, blob);

    return new Promise((resolve) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = Math.round(
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100
          );
          if (onProgress) onProgress(progress);
        },
        (error) => {
          resolve({ url: null, error: `[storage:uploadImage] ${error.message}` });
        },
        async () => {
          try {
            const url = await getDownloadURL(uploadTask.snapshot.ref);
            resolve({ url, error: null });
          } catch (error) {
            resolve({ url: null, error: `[storage:uploadImage] ${error.message}` });
          }
        }
      );
    });
  } catch (error) {
    return { url: null, error: `[storage:uploadImage] ${error.message}` };
  }
};

/**
 * Upload a single donation image (compressed)
 */
export const uploadDonationImage = async (uri, donationId, index, donorId, onProgress) => {
  const path = `donations/${donorId}/${donationId}/image_${index}`;
  return await uploadImage(uri, path, onProgress);
};

/**
 * Upload multiple donation images with transactional rollback on failure
 */
export const uploadMultipleDonationImages = async (uris, donationId, donorId, onProgress) => {
  const urls = [];
  const totalFiles = uris.length;
  
  if (totalFiles === 0) return { urls: [], error: null };

  try {
    for (let i = 0; i < totalFiles; i++) {
      const uri = uris[i];
      
      // Calculate progress segment for this file
      const handleProgress = (filePercent) => {
        if (onProgress) {
          const overallProgress = Math.round(
            ((i * 100) + filePercent) / totalFiles
          );
          onProgress(overallProgress);
        }
      };

      const { url, error } = await uploadDonationImage(uri, donationId, i, donorId, handleProgress);
      if (error) throw new Error(error);
      urls.push(url);
    }
    return { urls, error: null };
  } catch (error) {
    // Transactional Rollback: Delete any successfully uploaded images in this partial batch
    console.warn('[storage:uploadMultipleDonationImages] Failed. Cleaning up uploaded files...', error.message);
    try {
      await deleteDonationImages(donationId, donorId);
    } catch (cleanupError) {
      console.warn('[storage:uploadMultipleDonationImages] Cleanup failed:', cleanupError.message);
    }
    return { urls: [], error: `[storage:uploadMultipleDonationImages] ${error.message}` };
  }
};

export const uploadDonationImages = uploadMultipleDonationImages;

/**
 * Delete all images in a donation directory (listAll + deleteObject)
 */
export const deleteDonationImages = async (donationId, donorId) => {
  try {
    const dirRef = ref(storage, `donations/${donorId}/${donationId}`);
    const listResult = await listAll(dirRef);
    
    const deletePromises = listResult.items.map((itemRef) => deleteObject(itemRef));
    await Promise.all(deletePromises);
    
    return { error: null };
  } catch (error) {
    throw new Error(`[storage:deleteDonationImages] ${error.message}`);
  }
};

/**
 * Upload profile photo for a user
 */
export const uploadProfileImage = async (uri, userId, onProgress) => {
  try {
    const path = `profiles/${userId}/avatar`;
    const { url, error } = await uploadImage(uri, path, onProgress);
    if (error) throw new Error(error);
    return { url, error: null };
  } catch (error) {
    throw new Error(`[storage:uploadProfileImage] ${error.message}`);
  }
};
