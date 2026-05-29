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
    await updateDoc(donationRef, {
      verificationStatus: status,
      status: status === 'approved' ? 'approved' : status === 'rejected' ? 'rejected' : 'pending',
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
      status: 'open',
      volunteerId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }
};
