"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { getBrowserSupabaseClient } from "@/lib/supabaseClient";
import { syncUserProfileAndRole } from "@/lib/authHelpers";

export default function SignUpWriterPage() {
  const supabase = getBrowserSupabaseClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resolveRedirectUrl = () => {
    const envUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");

    if (envUrl) {
      return `${envUrl}/auth/confirm`;
    }

    if (typeof window !== "undefined") {
      return `${window.location.origin}/auth/confirm`;
    }

    return undefined;
  };

  const getFriendlyErrorMessage = (message?: string) => {
    if (!message) {
      return "Kayıt sırasında bir sorun oluştu. Lütfen tekrar dene.";
    }

    const normalized = message.toLowerCase();

    if (normalized.includes("already registered")) {
      return "Bu e-posta adresiyle zaten kayıtlı bir hesabınız var. Lütfen giriş yapın.";
    }

    if (normalized.includes("password should be at least")) {
      return "Şifren 6 karakterden uzun olmalıdır.";
    }

    if (normalized.includes("rate limit")) {
      return "Çok fazla deneme yaptın. Lütfen birkaç dakika sonra tekrar dene.";
    }

    return message;
  };

  const handleSignUp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setInfoMessage(null);
    setIsSubmitting(true);

    try {
      const cleanedUsername = username.trim();

      if (!cleanedUsername) {
        throw new Error("Kullanıcı adı zorunludur.");
      }

      if (!supabase) {
        console.error("Supabase client bulunamadı. Environment değişkenlerini kontrol edin.");
        throw new Error("Sistem yapılandırması tamamlanmadı. Lütfen daha sonra tekrar deneyin.");
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            role: "writer",
            username: cleanedUsername,
          },
          emailRedirectTo: resolveRedirectUrl(),
        },
      });

      if (signUpError) {
        console.error("Supabase signUp hatası:", signUpError.message);
        throw new Error(getFriendlyErrorMessage(signUpError.message));
      }

      const user = data.user;

      if (!user) {
        throw new Error("Kullanıcı oluşturulamadı. Lütfen tekrar deneyin.");
      }

      try {
        await syncUserProfileAndRole(supabase, user);
      } catch (profileSyncError) {
        console.error("Profil senkronizasyonu hatası (sign-up writer):", profileSyncError);
      }

      setInfoMessage(
        "Kayıt başarılı! Lütfen e-posta kutunu kontrol et ve doğrulama bağlantısına tıkla."
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Kayıt sırasında bir hata oluştu.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900/60 p-8 shadow-xl backdrop-blur">
        <div className="space-y-2 text-center">
          <p className="text-sm uppercase tracking-widest text-cyan-400">
            Ducktylo
          </p>
          <h1 className="text-3xl font-semibold">Senarist Kayıt</h1>
          <p className="text-slate-300">Yazarlara özel panelin kilidini aç.</p>
        </div>

        <form onSubmit={handleSignUp} className="mt-8 space-y-4">
          <label className="block text-sm font-medium text-slate-200">
            Kullanıcı Adı
            <input
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              required
              className="mt-2 w-full rounded-lg border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
              placeholder="ornek-yazar"
            />
          </label>

          <label className="block text-sm font-medium text-slate-200">
            E-posta
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="mt-2 w-full rounded-lg border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
              placeholder="yazar@ducktylo.com"
            />
          </label>

          <label className="block text-sm font-medium text-slate-200">
            Şifre
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={6}
              required
              className="mt-2 w-full rounded-lg border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
              placeholder="••••••••"
            />
          </label>

          {error ? (
            <p className="text-sm text-red-400">{error}</p>
          ) : infoMessage ? (
            <p className="text-sm text-cyan-300">{infoMessage}</p>
          ) : (
            <p className="text-xs text-slate-400">
              Kayıt olarak kullanım şartlarını kabul etmiş olursun.
            </p>
          )}

          <button
            type="submit"
            className="w-full rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:bg-cyan-500/60"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Kaydediliyor..." : "Hemen Başla"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-400">
          Zaten hesabın var mı? {" "}
          <Link href="/auth/sign-in" className="text-cyan-400 hover:underline">
            Giriş yap
          </Link>
        </p>
      </div>
    </main>
  );
}
