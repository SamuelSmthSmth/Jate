// src/hooks/useJobs.js
import { useState, useEffect } from "react";
import { db } from "../firebase";
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc 
} from "firebase/firestore";

export function useJobs(userId) {
  const [jobs, setJobs] = useState([]);

  useEffect(() => {
    if (!userId) return;

    // Listen to personal jobs where sharedListId is null
    const q = query(
      collection(db, "jobs"), 
      where("userId", "==", userId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const jobsData = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
      setJobs(jobsData);
    });

    return () => unsubscribe();
  }, [userId]);

  // Create a new job card
  const addJob = async (jobPayload) => {
    await addDoc(collection(db, "jobs"), {
      ...jobPayload,
      userId,
      createdAt: new Date().toISOString()
    });
  };

  // Update field maps (status changes, accordion updates, salary toggles)
  const updateJob = async (jobId, updatedFields) => {
    const jobRef = doc(db, "jobs", jobId);
    await updateDoc(jobRef, updatedFields);
  };

  // Remove a job entirely
  const deleteJob = async (jobId) => {
    const jobRef = doc(db, "jobs", jobId);
    await deleteDoc(jobRef);
  };

  return { jobs, addJob, updateJob, deleteJob };
}