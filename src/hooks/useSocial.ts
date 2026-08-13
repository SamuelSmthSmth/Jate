import { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabase";

export type FriendProfile = {
  id: string;
  displayName: string;
  friendCode: string;
  photoURL?: string;
  isPublic?: boolean;
};

function mapFriendProfile(row: Record<string, unknown>): FriendProfile {
  return {
    id: row.id as string,
    displayName: (row.display_name as string) || "Unknown",
    friendCode: (row.friend_code as string) || "",
    photoURL: (row.photo_url as string) ?? undefined,
    isPublic: (row.is_public as boolean) !== false,
  };
}

/** Lists the current user's friends (via the `friends` junction table). */
export function useFriends(userId: string | null) {
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) {
      setFriends([]);
      setLoading(false);
      return;
    }

    const { data: links, error: linkErr } = await supabase
      .from("friends")
      .select("friend_id")
      .eq("user_id", userId);

    if (linkErr) {
      console.error("Failed to fetch friends:", linkErr);
      setLoading(false);
      return;
    }

    const friendIds = (links ?? []).map((l) => l.friend_id as string);
    if (friendIds.length === 0) {
      setFriends([]);
      setLoading(false);
      return;
    }

    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("id, display_name, friend_code, photo_url, is_public")
      .in("id", friendIds);

    if (error) {
      console.error("Failed to fetch friends:", error);
      setLoading(false);
      return;
    }

    setFriends((profiles ?? []).map(mapFriendProfile));
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { friends, loading, refresh };
}

/** Adds a friend by their friend code (mutual: two junction rows). */
export async function addFriendByCode(currentUserId: string, friendCode: string) {
  const normalized = friendCode.trim().toUpperCase();

  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, friend_code, photo_url, is_public")
    .eq("friend_code", normalized)
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Friend code not found");
  if (data.id === currentUserId) throw new Error("Cannot add yourself");

  const { error: insertErr } = await supabase.from("friends").insert([
    { user_id: currentUserId, friend_id: data.id },
    { user_id: data.id, friend_id: currentUserId },
  ]);
  if (insertErr) throw new Error(insertErr.message);

  return mapFriendProfile(data);
}

/** Removes the friendship link in both directions. */
export async function removeFriend(userId: string, friendId: string) {
  await supabase
    .from("friends")
    .delete()
    .eq("user_id", userId)
    .eq("friend_id", friendId);
  await supabase
    .from("friends")
    .delete()
    .eq("user_id", friendId)
    .eq("friend_id", userId);
}
