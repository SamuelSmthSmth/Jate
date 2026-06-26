import { useState, useEffect } from "react";
import { UserMinus, ArrowLeft } from "lucide-react";
import { useFriends, addFriendByCode, FriendProfile } from "../../hooks/useSocial";
import { doc, updateDoc, arrayRemove, query, collection, where, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase";
import JobCard from "./JobCard";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground mb-2.5"
       style={{ fontFamily: "'Geist Mono', monospace" }}>
      {children}
    </p>
  );
}

export default function FriendsTab({ userId }: { userId: string }) {
  const { friends, loading } = useFriends(userId);

  const [newFriendCode, setNewFriendCode] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [viewingFriend, setViewingFriend] = useState<FriendProfile | null>(null);
  const [friendJobs, setFriendJobs] = useState<any[]>([]);

  useEffect(() => {
    if (!viewingFriend) {
      setFriendJobs([]);
      return;
    }
    const q = query(
      collection(db, "jobs"),
      where("userId", "==", viewingFriend.id)
    );
    const unsub = onSnapshot(q, (snapshot) => {
      setFriendJobs(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [viewingFriend]);


  const handleAddFriend = async () => {
    const code = newFriendCode.trim();
    if (!code) return;
    setAdding(true);
    setError(null);
    try {
      await addFriendByCode(userId, code);
      setNewFriendCode("");
    } catch (err: any) {
      setError(err.message || "Failed to add friend");
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveFriend = async (friendId: string) => {
    try {
      await updateDoc(doc(db, "users", userId), {
        friends: arrayRemove(friendId)
      });
      await updateDoc(doc(db, "users", friendId), {
        friends: arrayRemove(userId)
      });
    } catch (err) {
      console.error("Failed to remove friend", err);
    }
  };

if (viewingFriend) {
    return (
      <div className="flex-1 overflow-y-auto px-6 md:px-8 pb-8" style={{ scrollbarWidth: "none" }}>
        <div className="max-w-4xl mx-auto flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setViewingFriend(null)} className="p-2 rounded-md hover:bg-muted text-muted-foreground transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-lg font-semibold text-foreground">{viewingFriend.displayName}'s Jobs</h2>
              <p className="text-sm text-muted-foreground">Read-only view</p>
            </div>
          </div>
          <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden flex flex-col mt-2">
            {friendJobs.filter(j => !j.isArchived).length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">No active applications.</div>
            ) : (
              friendJobs.filter(j => !j.isArchived).map((job, idx, arr) => (
                <JobCard
                  key={job.id}
                  job={job as any}
                  isLast={idx === arr.length - 1}
                  readOnly={true}
                />
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-6 md:px-8 pb-8" style={{ scrollbarWidth: "none" }}>
      <div className="max-w-xl flex flex-col gap-6">
        {/* Add Friend */}
        <div className="border border-border rounded-lg p-5 bg-card">
          <p className="text-xs font-semibold text-foreground mb-3">Add a Friend</p>
          <div className="flex gap-2">
            <input type="text" value={newFriendCode}
              onChange={(e) => setNewFriendCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddFriend()}
              placeholder="Enter 6-digit Friend Code"
              className="flex-1 px-3 py-2 rounded-md border border-border bg-input-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              style={{ fontFamily: "'Geist Mono', monospace" }} />
            <button onClick={handleAddFriend} disabled={!newFriendCode.trim() || adding}
              className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed shrink-0">
              {adding ? "Adding..." : "Add"}
            </button>
          </div>
          {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
        </div>

        {/* Connected Friends */}
        <div>
          <SectionLabel>Connected Friends ({friends.length})</SectionLabel>
          {loading ? (
            <div className="border border-border rounded-lg p-6 text-center">
              <p className="text-sm text-muted-foreground">Loading friends...</p>
            </div>
          ) : friends.length === 0 ? (
            <div className="border border-border rounded-lg p-6 text-center">
              <p className="text-sm text-muted-foreground">No friends added yet.</p>
            </div>
          ) : (
            <div className="border border-border rounded-lg overflow-hidden">
              {friends.map((friend, idx) => (
                <div key={friend.id}
                  className={`flex items-center gap-3 px-4 py-3 bg-card hover:bg-secondary transition-colors ${
                    idx < friends.length - 1 ? "border-b border-border" : ""
                  }`}>
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 bg-secondary text-foreground`}>
                    {friend.displayName ? friend.displayName[0].toUpperCase() : "?"}
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col items-start">
                    {friend.isPublic ? (
                      <button onClick={() => setViewingFriend(friend)} className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline truncate text-left">
                        {friend.displayName}
                      </button>
                    ) : (
                      <p className="text-sm font-medium text-foreground truncate flex items-center gap-1.5">
                        {friend.displayName} <span className="text-[10px] text-muted-foreground font-normal px-1.5 py-0.5 rounded bg-muted">Private</span>
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground" style={{ fontFamily: "'Geist Mono', monospace" }}>
                      {friend.friendCode}
                    </p>
                  </div>
                  <button onClick={() => handleRemoveFriend(friend.id)}
                    className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors shrink-0">
                    <UserMinus className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
