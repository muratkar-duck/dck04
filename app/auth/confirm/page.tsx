"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getBrowserSupabaseClient } from "@/lib/supabaseClient";

const roleRedirectMap: Record<string, string> = {
  writer: "/dashboard/writer",
  producer: "/dashboard/producer",
};

export default function AuthConfirmPage() {
  const router = useRouter();

  useEffect(() => {
    const supabase = getBrowserSupabaseClient();

    if (!supabase) {
      router.replace("/auth/sign-in?error=invalid_link");
      return;
    }

    let isMounted = true;

    const finalizeVerification = async () => {
      const { data, error } = await supabase.auth.getUser();

      if (!isMounted) {
        return;
      }

      if (error || !data?.user) {
        router.replace("/auth/sign-in?error=invalid_link");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("users")
        .select("role")
        .eq("id", data.user.id)
        .maybeSingle();

      if (profileError && profileError.code !== "PGRST116") {
        console.error("Supabase users select hatası:", profileError);
      }

      const role = profile?.role as string | undefined;

      if (role && roleRedirectMap[role]) {
        router.replace(roleRedirectMap[role]);
        return;
      }

      router.replace("/auth/sign-in?confirmed=1");
    };

    finalizeVerification();

    return () => {
      isMounted = false;
    };
  }, [router]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900/60 p-8 text-center shadow-xl backdrop-blur">
        <p className="text-sm uppercase tracking-widest text-cyan-400">Ducktylo</p>
        <h1 className="mt-4 text-2xl font-semibold text-white">E-posta Doğrulanıyor</h1>
        <p className="mt-2 text-slate-300">Hesabınız doğrulanıyor, lütfen bekleyin…</p>
      </div>
    </main>
  );
}
