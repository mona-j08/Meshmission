import { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { functions } from '../firebase/config';
import { 
  collection, 
  doc, 
  onSnapshot, 
  updateDoc, 
  addDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  where 
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';

// Hook to listen to an entire collection in real-time
export function useCollection(collectionName, orderField = 'createdAt', orderDirection = 'desc') {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    let q;
    try {
      if (orderField) {
        q = query(collection(db, collectionName), orderBy(orderField, orderDirection));
      } else {
        q = query(collection(db, collectionName));
      }
    } catch (err) {
      console.warn('Query building error (might be missing index or invalid field):', err);
      q = collection(db, collectionName);
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() });
      });
      setData(items);
      setLoading(false);
    }, (err) => {
      console.error(`Error fetching collection ${collectionName}:`, err);
      setError(err.message);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [collectionName, orderField, orderDirection]);

  return { data, loading, error };
}

// Hook to listen to a collection with custom where query
export function useCollectionFiltered(collectionName, filterField, filterValue, orderField = 'createdAt', orderDirection = 'desc') {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!filterField || filterValue === undefined) return;
    setLoading(true);
    let q;
    try {
      if (orderField) {
        q = query(
          collection(db, collectionName),
          where(filterField, '==', filterValue),
          orderBy(orderField, orderDirection)
        );
      } else {
        q = query(
          collection(db, collectionName),
          where(filterField, '==', filterValue)
        );
      }
    } catch (err) {
      q = query(collection(db, collectionName), where(filterField, '==', filterValue));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() });
      });
      setData(items);
      setLoading(false);
    }, (err) => {
      console.error(`Error filtering collection ${collectionName}:`, err);
      setError(err.message);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [collectionName, filterField, filterValue, orderField, orderDirection]);

  return { data, loading, error };
}

// Firestore CRUD operations for Admin Action Panel
export const firestoreService = {
  // Update donation status/verification
  updateDonationVerification: async (donationId, status, details = {}) => {
    const donationRef = doc(db, 'donations', donationId);
    
    // Map verification status to donation status
    let donationStatus = 'pending';
    if (status === 'approved') {
      donationStatus = 'approved';
    } else if (status === 'rejected') {
      donationStatus = 'rejected';
    } else if (status === 'needs_review') {
      donationStatus = 'pending';
    }
    
    await updateDoc(donationRef, {
      verificationStatus: status,
      status: donationStatus,
      ...details,
      updatedAt: new Date().toISOString()
    });
  },

  // Toggle user active status or change role
  updateUserRole: async (userId, role) => {
    const setUserRole = httpsCallable(functions, 'setUserRole');
    await setUserRole({ userId, role });
  },

  updateUserStatus: async (userId, isActive) => {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      isActive,
      updatedAt: new Date().toISOString()
    });
  },

  // Create, Update, Delete Collection Points
  createCollectionPoint: async (data) => {
    const collRef = collection(db, 'collection_points');
    return await addDoc(collRef, {
      ...data,
      currentCapacity: Number(data.currentCapacity || 0),
      maxCapacity: Number(data.maxCapacity || 100),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  },

  updateCollectionPoint: async (pointId, data) => {
    const docRef = doc(db, 'collection_points', pointId);
    await updateDoc(docRef, {
      ...data,
      currentCapacity: Number(data.currentCapacity),
      maxCapacity: Number(data.maxCapacity),
      updatedAt: new Date().toISOString()
    });
  },

  deleteCollectionPoint: async (pointId) => {
    const docRef = doc(db, 'collection_points', pointId);
    await deleteDoc(docRef);
  },

  // Manual Pickup Task Assignment
  assignPickupTask: async (taskData) => {
    const tasksRef = collection(db, 'pickup_tasks');
    return await addDoc(tasksRef, {
      ...taskData,
      status: 'assigned',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  },

  // Open Market Task Creation
  createOpenPickupTask: async (taskData) => {
    const tasksRef = collection(db, 'pickup_tasks');
    return await addDoc(tasksRef, {
      ...taskData,
      donationIds: taskData.donationIds || (taskData.donationId ? [taskData.donationId] : []),
      status: 'open',
      volunteerId: null,
      // Donation summary fields
      category:             taskData.category             || null,
      description:          taskData.description          || null,
      units:                taskData.units != null ? Number(taskData.units) : null,
      // Donor contact details (revealed after volunteer accepts)
      donorName:            taskData.donorName            || null,
      donorPhone:           taskData.donorPhone           || null,
      donorAddress:         taskData.donorAddress         || null,
      // Pickup scheduling
      preferredPickupDate:  taskData.preferredPickupDate  || null,
      pickupTime:           taskData.pickupTime           || null,
      pickupPreference:     taskData.pickupPreference     || taskData.pickupTime || null,
      // Drop-off / NGO / Receiver fields
      ngoName:              taskData.ngoName              || null,
      ngoAddress:           taskData.ngoAddress           || null,
      receiverName:         taskData.receiverName         || taskData.ngoName || null,
      receiverPhone:        taskData.receiverPhone        || null,
      receiverAddress:      taskData.receiverAddress      || taskData.ngoAddress || null,
      collectionPointId:    taskData.collectionPointId    || null,
      collectionPointName:  taskData.collectionPointName  || null,
      collectionPointAddress: taskData.collectionPointAddress || null,
      dropOffLocation:      taskData.dropOffLocation      || null,
      // Image URLs
      imageUrls:            taskData.imageUrls            || [],
      // OTP fields
      otp:                  null,
      otpExpiresAt:         null,
      otpVerified:          false,
      otpAttempts:          0,
      otpGenerationCount:   0,
      lastOtpGeneratedAt:   null,
      scheduledDate:        null,
      completedAt:          null,
      createdAt:            new Date().toISOString(),
      updatedAt:            new Date().toISOString(),
    });
  }
};
