import { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabase";

export type AuthUser = {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  friendCode: string | null;
  isPublic: boolean;
};

const generateFriendCode = () =>
  Math.random().toString(36).substring(2, 8).toUpperCase();

function mapProfile(row: Record<string, unknown>): AuthUser {
  return {
    uid: row.id as string,
    displayName: (row.display_name as string) ?? null,
    email: (row.email as string) ?? null,
    photoURL: (row.photo_url as string) ?? null,
    friendCode: (row.friend_code as string) ?? null,
    isPublic: (row.is_public as boolean) !== false,
  };
}

/**
 * Loads (or creates) the profiles row for an authenticated Supabase user and
 * returns the AuthUser shape the app expects (camelCase). Falls back to auth
 * metadata if the schema hasn't been applied yet, so the app never hangs.
 */
async function loadProfile(authUser: {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
}): Promise<AuthUser> {
  const id = authUser.id;
  const fullName = (authUser.user_metadata?.full_name as string) ?? null;
  const avatarUrl = (authUser.user_metadata?.avatar_url as string) ?? null;
  const email = authUser.email ?? null;

  const fallback: AuthUser = {
    uid: id,
    displayName: fullName,
    email,
    photoURL: avatarUrl,
    friendCode: null,
    isPublic: true,
  };

  try {
    const { data: existing } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (!existing) {
      const profile = {
        id,
        display_name: fullName,
        email,
        photo_url: avatarUrl,
        friend_code: generateFriendCode(),
        is_public: true,
      };
      const { error } = await supabase.from("profiles").insert(profile);
      if (error) {
        // Race with the auth listener, or schema not yet applied.
        const { data: raced } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", id)
          .maybeSingle();
        if (raced) return mapProfile(raced);
        console.error("Failed to create profile:", error);
        return fallback;
      }
      return mapProfile(profile);
    }

    // Refresh email/photo if they changed, but preserve the user's edited
    // display name and their permanent friend code.
    const updates: Record<string, unknown> = {};
    if ((existing.email ?? null) !== email) updates.email = email;
    if ((existing.photo_url ?? null) !== avatarUrl) updates.photo_url = avatarUrl;
    if (Object.keys(updates).length > 0) {
      await supabase.from("profiles").update(updates).eq("id", id);
    }

    return mapProfile({ ...existing, ...updates });
  } catch (err) {
    console.error("Failed to load profile:", err);
    return fallback;
  }
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.user) {
      setUser(await loadProfile(session.user));
    } else {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!cancelled) {
        if (session?.user) setUser(await loadProfile(session.user));
        else setUser(null);
        setLoading(false);
      }
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "TOKEN_REFRESHED") return;
      refreshUser();
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [refreshUser]);

  const loginWithGoogle = () =>
    supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });

  const logout = () => supabase.auth.signOut();

  const updatePrivacy = async (uid: string, isPublic: boolean) => {
    if (!uid) return;
    await supabase.from("profiles").update({ is_public: isPublic }).eq("id", uid);
    setUser((prev) => (prev ? { ...prev, isPublic } : prev));
  };

  return { user, loading, loginWithGoogle, logout, updatePrivacy, refreshUser };
}
