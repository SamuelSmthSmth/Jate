import { useState } from "react";
import { useSharedLists, useFriends, createSharedList, useSharedJobs } from "../../hooks/useSocial";
import JobCard from "./JobCard";

function formatDate(iso: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

export default function SharedListsTab({ userId }: { userId: string }) {
  const { sharedLists, loading: listsLoading } = useSharedLists(userId);
  const { friends, loading: friendsLoading } = useFriends(userId);
  
  const [activeListId, setActiveListId] = useState<string | null>(null);
  
  const [showCreate, setShowCreate] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  const { jobs: sharedJobs, loading: jobsLoading, updateJob, deleteJob } = useSharedJobs(activeListId);

  const handleCreateList = async () => {
    if (!newListName.trim()) return;
    setCreating(true);
    try {
      await createSharedList(newListName.trim(), selectedMembers, userId);
      setNewListName("");
      setSelectedMembers([]);
      setShowCreate(false);
    } catch (err) {
      console.error("Failed to create list", err);
    } finally {
      setCreating(false);
    }
  };

  const toggleMember = (friendId: string) => {
    setSelectedMembers(prev => 
      prev.includes(friendId) ? prev.filter(id => id !== friendId) : [...prev, friendId]
    );
  };

  if (activeListId) {
    const activeList = sharedLists.find(l => l.id === activeListId);
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="px-6 md:px-8 pb-4 pt-2">
          <button onClick={() => setActiveListId(null)} className="text-sm text-muted-foreground hover:text-foreground mb-4">
            ← Back to Lists
          </button>
          <h2 className="text-lg font-semibold text-foreground">{activeList?.name}</h2>
          <p className="text-sm text-muted-foreground">{activeList?.members.length} members</p>
        </div>
        <div className="flex-1 overflow-y-auto px-6 md:px-8 pb-8" style={{ scrollbarWidth: "none" }}>
          {jobsLoading ? (
            <p className="text-sm text-muted-foreground text-center">Loading jobs...</p>
          ) : sharedJobs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center mt-10">No jobs in this shared list.</p>
          ) : (
             <div className="job-list border border-border rounded-lg overflow-hidden">
              {sharedJobs.map((job, idx) => (
                <JobCard
                  key={job.id}
                  job={job}
                  updateJob={updateJob}
                  deleteJob={deleteJob}
                  isLast={idx === sharedJobs.length - 1}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-6 md:px-8 pb-8" style={{ scrollbarWidth: "none" }}>
      <div className="max-w-xl flex flex-col gap-6">
        
        {/* Create List Toggle or Form */}
        {!showCreate ? (
          <button onClick={() => setShowCreate(true)} className="w-fit flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
            + New Shared List
          </button>
        ) : (
          <div className="border border-border rounded-lg p-5 bg-card">
            <p className="text-xs font-semibold text-foreground mb-4">Create a Shared Group</p>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-foreground">Group Name</label>
                <input type="text" value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  placeholder="e.g. Design Internships 2026"
                  className="px-3 py-2 rounded-md border border-border bg-input-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground block mb-2">Invite Friends</label>
                {friendsLoading ? (
                  <p className="text-xs text-muted-foreground">Loading friends...</p>
                ) : friends.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic px-1">
                    Add friends first to invite them to a group.
                  </p>
                ) : (
                  <div className="flex flex-col gap-1">
                    {friends.map((friend) => (
                      <label key={friend.id}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-muted transition-colors cursor-pointer">
                        <input type="checkbox"
                          checked={selectedMembers.includes(friend.id)}
                          onChange={() => toggleMember(friend.id)}
                          className="rounded border-border text-primary focus:ring-primary" />
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0 bg-secondary text-foreground`}>
                          {friend.displayName ? friend.displayName[0].toUpperCase() : "?"}
                        </div>
                        <span className="text-sm font-medium text-foreground">{friend.displayName}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2 mt-2">
                <button onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                  Cancel
                </button>
                <button onClick={handleCreateList} disabled={!newListName.trim() || creating} className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed">
                  {creating ? "Creating..." : "Create Shared List"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Existing Lists */}
        <div>
          <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground mb-2.5"
             style={{ fontFamily: "'Geist Mono', monospace" }}>
            Your Shared Lists
          </p>
          {listsLoading ? (
             <div className="border border-border rounded-lg p-6 text-center">
              <p className="text-sm text-muted-foreground">Loading lists...</p>
            </div>
          ) : sharedLists.length === 0 ? (
            <div className="border border-border rounded-lg p-6 text-center">
              <p className="text-sm text-muted-foreground">No shared lists yet.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {sharedLists.map(list => (
                <button key={list.id} onClick={() => setActiveListId(list.id)} className="flex flex-col items-start gap-1 p-4 rounded-lg border border-border bg-card hover:border-primary/40 hover:bg-accent/50 transition-all text-left">
                  <span className="font-semibold text-foreground">{list.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {list.members.length} member{list.members.length !== 1 ? 's' : ''} · Created {formatDate(list.createdAt)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
