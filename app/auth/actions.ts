"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export type AuthFormState = { error?: string; message?: string; email?: string } | undefined;

function formText(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

// "fetch failed" (status 0) means this computer could not reach Supabase at
// all: a wrong URL in .env.local, a paused project, or no internet/DNS.
const NETWORK_MESSAGE =
  "We could not reach the Supabase service. Check your internet connection, the NEXT_PUBLIC_SUPABASE_URL in .env.local, and that your Supabase project is not paused.";

function isNetworkError(error: { status?: number; message: string }) {
  return error.status === 0 || /fetch failed/i.test(error.message);
}

// Turns Supabase's error into a plain sentence that says what to do next.
// While developing (npm run dev) the original message is added in brackets.
function signUpErrorMessage(error: { code?: string; status?: number; message: string }) {
  let text: string;
  if (isNetworkError(error)) return NETWORK_MESSAGE;
  switch (error.code) {
    case "user_already_exists":
      text = "An account with this email already exists. Try signing in instead.";
      break;
    case "weak_password":
      text = "That password is too easy to guess. Try a longer one with letters and numbers.";
      break;
    case "email_address_invalid":
      text = "That email address does not look right. Check it and try again.";
      break;
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      text = "Too many sign-up emails were sent recently. Wait a little while and try again.";
      break;
    case "email_address_not_authorized":
      text =
        "Supabase's built-in email service only sends to your own team's addresses. Use your own email address, or set up a custom email provider in Supabase.";
      break;
    case "signup_disabled":
      text = "New sign-ups are switched off in this Supabase project.";
      break;
    default:
      text = /confirmation email/i.test(error.message)
        ? "Your account was started but the confirmation email could not be sent. Try again in a few minutes."
        : "We could not create your account. Check the details and try again.";
  }
  return process.env.NODE_ENV === "production" ? text : `${text} (${error.message})`;
}

export async function signIn(_state: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const supabase = await createClient();
  if (!supabase) return { error: "Add your Supabase URL and publishable key to .env.local first." };
  const email = formText(formData, "email");
  const password = formText(formData, "password");
  if (!email || !password) return { error: "Enter your email and password." };
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    console.error("[sign in]", error.status, error.code, error.message);
    if (isNetworkError(error)) return { error: NETWORK_MESSAGE };
    return {
      error:
        error.code === "email_not_confirmed"
          ? "Please confirm your email first. We sent you a link when you created your account."
          : "We could not sign you in. Check your email and password, then try again.",
    };
  }
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { error: "Your sign-in could not be verified. Please try again." };
  const { data, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .maybeSingle();
  if (profileError || !data)
    return { error: "Your account profile is not ready. Apply the database migration, then try again." };
  redirect("/auth/continue");
}

export async function signUp(_state: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const supabase = await createClient();
  if (!supabase) return { error: "Add your Supabase URL and publishable key to .env.local first." };
  const email = formText(formData, "email");
  const password = formText(formData, "password");
  const name = formText(formData, "name");
  if (!email || password.length < 8 || !name) {
    return {
      error: "Enter your name, a valid email, and a password with at least 8 characters.",
    };
  }
  const requestOrigin = (await headers()).get("origin") ?? "http://localhost:3000";
  const siteOrigin = process.env.NEXT_PUBLIC_SITE_URL ?? requestOrigin;
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: new URL("/auth/callback", siteOrigin).toString(), data: { display_name: name } },
  });
  if (error) {
    // Shown in the terminal where `npm run dev` is running, so the real cause is never hidden.
    console.error("[sign up]", error.status, error.code, error.message);
    return { error: signUpErrorMessage(error) };
  }
  if (!data.session) return { message: "Check your email to confirm your account, then sign in.", email };
  redirect("/auth/continue");
}

export async function signOut() {
  const supabase = await createClient();
  if (supabase) await supabase.auth.signOut();
  redirect("/");
}
