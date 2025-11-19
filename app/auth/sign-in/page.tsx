"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { type User } from "@supabase/supabase-js";
import { getBrowserSupabaseClient } from "@/lib/supabaseClient";

export default function SignInPage() {
  const router = useRouter();
  const supabase = getBrowserSupabaseClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getFriendlyErrorMessage = (message?: string) => {
    if (!message) {
      return "Giriş sırasında bir hata oluştu.";
    }

    const normalized = message.toLowerCase();

    if (normalized.includes("invalid login credentials")) {
      return "E-posta veya şifre hatalı.";
    }

    if (normalized.includes("email not confirmed") || normalized.includes("email_not_confirmed")) {
      return "Lütfen e-posta adresini onayla.";
    }

    if (normalized.includes("user not found")) {
      return "Bu e-posta adresiyle kayıtlı bir kullanıcı bulunamadı.";
    }

    if (normalized.includes("rate limit")) {
      return "Çok fazla deneme yaptın. Lütfen birkaç dakika sonra tekrar dene.";
    }

    return message;
  };

  const handlePostAuth = useCallback(
    async (user: User) => {
      if (!supabase) {
        console.error("Supabase client bulunamadı. Environment değişkenlerini kontrol edin.");
        setError("Sistem yapılandırması tamamlanmadı. Lütfen daha sonra tekrar dene.");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError && profileError.code !== "PGRST116") {
        console.error("Supabase users select hatası:", profileError.message);
      }

      const resolvedRole = (profile?.role as "writer" | "producer" | undefined) ??
        (user.user_metadata?.role as "writer" | "producer" | undefined) ??
        "writer";

      if (!profile) {
        const { error: upsertError } = await supabase.from("users").upsert(
          {
            id: user.id,
            email: user.email ?? undefined,
            username: (user.user_metadata?.username as string | undefined) ?? undefined,
            role: resolvedRole,
          },
          { onConflict: "id" }
        );

        if (upsertError) {
          console.error("Supabase users upsert hatası:", upsertError.message);
        }
      }

      const destination = resolvedRole === "producer" ? "/dashboard/producer" : "/dashboard/writer";
      router.push(destination);
    },
    [router, supabase]
  );

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let isMounted = true;

    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      const activeUser = data.session?.user;

      if (activeUser && isMounted) {
        await handlePostAuth(activeUser);
      }
    };

    checkSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        handlePostAuth(session.user);
      }
    });

    return () => {
      isMounted = false;
      listener?.subscription.unsubscribe();
    };
  }, [handlePostAuth, supabase]);

  const handleSignIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (!supabase) {
        console.error("Supabase client bulunamadı. Environment değişkenlerini kontrol edin.");
        throw new Error("Sistem yapılandırması tamamlanmadı. Lütfen daha sonra tekrar dene.");
      }

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (signInError) {
        console.error("Supabase signIn hatası:", signInError.message);
        throw new Error(getFriendlyErrorMessage(signInError.message));
      }

      const user = data.user;

      if (!user) {
        throw new Error("Giriş başarısız. Lütfen bilgilerini kontrol et.");
      }

      await handlePostAuth(user);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Giriş sırasında bir hata oluştu.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900/60 p-8 shadow-xl backdrop-blur">
        <div className="space-y-2 text-center">
          <p className="text-sm uppercase tracking-widest text-emerald-300">
            Ducktylo
          </p>
          <h1 className="text-3xl font-semibold">Giriş Yap</h1>
          <p className="text-slate-300">Hesabına eriş ve projelerini yönet.</p>
        </div>

        <form onSubmit={handleSignIn} className="mt-8 space-y-4">
          <label className="block text-sm font-medium text-slate-200">
            E-posta
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="mt-2 w-full rounded-lg border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-emerald-300 focus:outline-none"
              placeholder="ornek@ducktylo.com"
            />
          </label>

          <label className="block text-sm font-medium text-slate-200">
            Şifre
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              className="mt-2 w-full rounded-lg border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-emerald-300 focus:outline-none"
              placeholder="••••••••"
            />
          </label>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            className="w-full rounded-lg bg-emerald-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:bg-emerald-300/60"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Kontrol ediliyor..." : "Giriş Yap"}
          </button>
        </form>

        <div className="mt-6 space-y-2 text-center text-sm text-slate-400">
          <p>
            Senarist misin? {" "}
            <Link href="/auth/sign-up-writer" className="text-emerald-300 hover:underline">
              Hemen kayıt ol
            </Link>
          </p>
          <p>
            Yapımcı mısın? {" "}
            <Link href="/auth/sign-up-producer" className="text-emerald-300 hover:underline">
              Stüdyo hesabı aç
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
