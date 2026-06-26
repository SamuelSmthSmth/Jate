import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, doc, getDoc, getDocs, updateDoc, arrayUnion, addDoc, limit, deleteDoc } from "firebase/firestore";
import { db } from "../firebase";

export type FriendProfile = {
  id: string;
  displayName: string;
  friendCode: string;
  photoURL?: string;
};

export type SharedListDoc = {
  id: string;
  name: string;
  members: string[];
  createdBy: string;
  createdAt: string;
};

// 1. useFriends
export function useFriends(userId: string | null) {
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setFriends([]);
      setLoading(false);
      return;
    }

    const unsub = onSnapshot(doc(db, "users", userId), async (snapshot) => {
      if (!snapshot.exists()) {
        setFriends([]);
        setLoading(false);
        return;
      }
      
      const friendIds = snapshot.data().friends || [];
      if (friendIds.length === 0) {
        setFriends([]);
        setLoading(false);
        return;
      }

      try {
        const friendDocs = await Promise.all(
          friendIds.map((id: string) => getDoc(doc(db, "users", id)))
        );
        
        const friendsList = friendDocs
          .filter(d => d.exists())
          .map(d => ({
            id: d.id,
            displayName: d.data()?.displayName || "Unknown",
            friendCode: d.data()?.friendCode || "",
            photoURL: d.data()?.photoURL,
          }));
          
        setFriends(friendsList);
      } catch (err) {
        console.error("Failed to fetch friends:", err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, [userId]);

  return { friends, loading };
}

// 2. useSharedLists
export function useSharedLists(userId: string | null) {
  const [sharedLists, setSharedLists] = useState<SharedListDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setSharedLists([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "shared_lists"),
      where("members", "array-contains", userId)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const lists = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      })) as SharedListDoc[];
      lists.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      setSharedLists(lists);
      setLoading(false);
    });

    return () => unsub();
  }, [userId]);

  return { sharedLists, loading };
}

// 3. useSharedJobs
export function useSharedJobs(sharedListId: string | null) {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sharedListId) {
      setJobs([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "jobs"),
      where("sharedListId", "==", sharedListId)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const jobList = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));
      setJobs(jobList);
      setLoading(false);
    });

    return () => unsub();
  }, [sharedListId]);

  const addJob = async (jobData: any) => {
    if (!sharedListId) return;
    await addDoc(collection(db, "jobs"), {
      ...jobData,
      sharedListId,
      createdAt: new Date().toISOString()
    });
  };

  const updateJob = async (jobId: string, updates: any) => {
    await updateDoc(doc(db, "jobs", jobId), updates);
  };

  const deleteJob = async (jobId: string) => {
    await deleteDoc(doc(db, "jobs", jobId));
  };

  return { jobs, loading, addJob, updateJob, deleteJob };
}

// 4. addFriendByCode
export async function addFriendByCode(currentUserId: string, friendCode: string) {
  const q = query(collection(db, "users"), where("friendCode", "==", friendCode), limit(1));
  const snapshot = await getDocs(q);
  
  if (snapshot.empty) {
    throw new Error("Friend code not found");
  }

  const targetDoc = snapshot.docs[0];
  const targetUid = targetDoc.id;

  if (targetUid === currentUserId) {
    throw new Error("Cannot add yourself");
  }

  // Update current user's friends list
  await updateDoc(doc(db, "users", currentUserId), {
    friends: arrayUnion(targetUid)
  });

  // Update target user's friends list
  await updateDoc(doc(db, "users", targetUid), {
    friends: arrayUnion(currentUserId)
  });

  return {
    id: targetUid,
    ...targetDoc.data()
  };
}

// 5. createSharedList
export async function createSharedList(name: string, memberUids: string[], createdByUid: string) {
  const allMembers = Array.from(new Set([createdByUid, ...memberUids]));
  
  const docRef = await addDoc(collection(db, "shared_lists"), {
    name,
    members: allMembers,
    createdBy: createdByUid,
    createdAt: new Date().toISOString()
  });

  return docRef.id;
}
