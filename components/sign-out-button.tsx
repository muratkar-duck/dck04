"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getBrowserSupabaseClient } from "@/lib/supabaseClient";

export function SignOutButton() {
  const router = useRouter();
  const supabase = getBrowserSupabaseClient();
  const [isLoading, setIsLoading] = useState(false);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setHasSession(false);
      return;
    }

    let isMounted = true;

    const syncSessionState = async () => {
      const { data } = await supabase.auth.getSession();
      if (!isMounted) return;
      setHasSession(!!data.session?.user);
    };

    syncSessionState();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setHasSession(!!session?.user);
    });

    return () => {
      isMounted = false;
      listener?.subscription.unsubscribe();
    };
  }, [supabase]);

  const handleSignOut = async () => {
    if (!supabase) {
      return;
    }

    setIsLoading(true);
    try {
      await supabase.auth.signOut();
      setHasSession(false);
      router.push("/auth/sign-in");
    } finally {
      setIsLoading(false);
    }
  };

  if (!supabase || !hasSession) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={isLoading}
      className="rounded-full border border-white/10 px-4 py-1.5 text-sm font-medium text-white transition hover:border-white/40 hover:text-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {isLoading ? "Çıkılıyor..." : "Çıkış Yap"}
    </button>
  );
}
