"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

// Types for admin settings
export type RagSettings = {
  openai_model: string;
  embedding_model: string;
  match_threshold: number;
  match_count: number;
  chunk_size: number;
  chunk_overlap: number;
  system_prompt: string;
};

export type UserProfile = {
  id: string;
  email: string;
  is_admin: boolean;
  created_at: string;
};

// Check if the current user is an admin
export async function isCurrentUserAdmin(): Promise<boolean> {
  try {
    const supabase = createClient();

    // Get the current user with authenticated method
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("Error getting authenticated user:", userError);
      return false;
    }

    // First check if the user profile exists
    const { count, error: countError } = await supabase
      .from("user_profiles")
      .select("*", { count: "exact", head: true })
      .eq("id", user.id);

    if (countError) {
      console.error("Error checking if user profile exists:", countError);
      return false;
    }

    // If no profile exists, create one with is_admin=false
    if (count === 0) {
      const { error: insertError } = await supabase
        .from("user_profiles")
        .insert({
          id: user.id,
          is_admin: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (insertError) {
        console.error("Error creating user profile:", insertError);
      }

      return false;
    }

    // Now we know the profile exists, get the admin status
    const { data, error } = await supabase
      .from("user_profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (error) {
      console.error("Error checking admin status:", error);
      return false;
    }

    return data?.is_admin || false;
  } catch (error) {
    console.error("Unexpected error in isCurrentUserAdmin:", error);
    return false;
  }
}

// Admin middleware - redirects if not admin
export async function adminGuard() {
  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) {
    redirect("/");
  }
}

// Get all RAG settings
export async function getRagSettings(): Promise<RagSettings> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("settings")
    .select("value")
    .eq("id", "rag_settings")
    .single();

  if (error) {
    console.error("Error fetching RAG settings:", error);
    // Return default settings if there's an error
    return {
      openai_model: "gpt-4o",
      embedding_model: "text-embedding-3-small",
      match_threshold: 0.7,
      match_count: 5,
      chunk_size: 1000,
      chunk_overlap: 200,
      system_prompt:
        "You are a helpful assistant that answers questions based on the user's documents. Format your responses using Markdown for better readability.",
    };
  }

  return data.value as RagSettings;
}

// Update RAG settings
export async function updateRagSettings(settings: RagSettings): Promise<void> {
  const supabase = createClient();

  // Get the current user with authenticated method
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error("User not authenticated");
  }

  // Validate settings
  if (settings.match_threshold < 0 || settings.match_threshold > 1) {
    throw new Error("Match threshold must be between 0 and 1");
  }

  if (settings.match_count < 1 || settings.match_count > 20) {
    throw new Error("Match count must be between 1 and 20");
  }

  if (settings.chunk_size < 100 || settings.chunk_size > 5000) {
    throw new Error("Chunk size must be between 100 and 5000");
  }

  if (
    settings.chunk_overlap < 0 ||
    settings.chunk_overlap >= settings.chunk_size
  ) {
    throw new Error("Chunk overlap must be between 0 and less than chunk size");
  }

  // Update settings
  const { error } = await supabase
    .from("settings")
    .update({
      value: settings,
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    })
    .eq("id", "rag_settings");

  if (error) {
    console.error("Error updating RAG settings:", error);
    throw new Error("Failed to update RAG settings");
  }

  revalidatePath("/admin/settings");
}

// Get all users with admin status
export async function getUsers(): Promise<UserProfile[]> {
  const supabase = createClient();

  // Get all users from auth.users
  const { data: authUsers, error: authError } =
    await supabase.auth.admin.listUsers();

  if (authError) {
    console.error("Error fetching users:", authError);
    return [];
  }

  // Get admin status from user_profiles
  const { data: profiles, error: profilesError } = await supabase
    .from("user_profiles")
    .select("id, is_admin");

  if (profilesError) {
    console.error("Error fetching user profiles:", profilesError);
    return [];
  }

  // Create a map of user IDs to admin status
  const adminMap = new Map<string, boolean>();
  profiles?.forEach((profile) => {
    adminMap.set(profile.id, profile.is_admin);
  });

  // Combine the data
  const users = authUsers.users.map((user) => ({
    id: user.id,
    email: user.email || "No email",
    is_admin: adminMap.get(user.id) || false,
    created_at: user.created_at,
  }));

  return users;
}

// Set user admin status
export async function setUserAdminStatus(
  userId: string,
  isAdmin: boolean
): Promise<void> {
  const supabase = createClient();

  // Check if user profile exists
  const { data: existingProfile, error: profileError } = await supabase
    .from("user_profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (profileError && profileError.code !== "PGRST116") {
    console.error("Error checking user profile:", profileError);
    throw new Error("Failed to check user profile");
  }

  if (existingProfile) {
    // Update existing profile
    const { error } = await supabase
      .from("user_profiles")
      .update({
        is_admin: isAdmin,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (error) {
      console.error("Error updating user admin status:", error);
      throw new Error("Failed to update user admin status");
    }
  } else {
    // Create new profile
    const { error } = await supabase.from("user_profiles").insert({
      id: userId,
      is_admin: isAdmin,
    });

    if (error) {
      console.error("Error creating user profile:", error);
      throw new Error("Failed to create user profile");
    }
  }

  revalidatePath("/admin/users");
}
