import { useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../lib/firebase';

export function useUserCollection<T extends { id: string }>(userId: string | undefined, collectionName: string) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!userId) {
      setData([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const ref = collection(db, 'users', userId, collectionName);
    const q = query(ref, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }) as T);
        setData(items);
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setError('โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [userId, collectionName]);

  return { data, loading, error };
}
