"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { getBrowserSupabaseClient } from "@/lib/supabaseClient";

export function SignOutButton() {
  const router = useRouter();
  const supabase = getBrowserSupabaseClient();
  const [isLoading, setIsLoading] = useState(false);

  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      await supabase.auth.signOut();
      router.push("/auth/sign-in");
    } finally {
      setIsLoading(false);
    }
  };

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
