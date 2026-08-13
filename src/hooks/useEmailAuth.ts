import { supabase } from "../supabase";

export async function registerWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  if (!data.session) {
    throw new Error(
      "Account created — check your email to confirm your account, then sign in."
    );
  }
  return data;
}

export async function loginWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}
