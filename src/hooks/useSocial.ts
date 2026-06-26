import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, doc, getDoc, getDocs, updateDoc, arrayUnion, addDoc, limit, deleteDoc } from "firebase/firestore";
import { db } from "../firebase";

export type FriendProfile = {
  id: string;
  displayName: string;
  friendCode: string;
  photoURL?: string;
  isPublic?: boolean;
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
            isPublic: d.data()?.isPublic !== false,
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

