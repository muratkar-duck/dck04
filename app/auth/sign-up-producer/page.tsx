"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import Link from "next/link";
import { getBrowserSupabaseClient } from "@/lib/supabaseClient";

export default function SignUpProducerPage() {
  const router = useRouter();
  const supabase = getBrowserSupabaseClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSignUp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const cleanedUsername = username.trim();

      if (!cleanedUsername) {
        throw new Error("Profil adı zorunludur.");
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) {
        throw signUpError;
      }

      const userId = data.user?.id;

      if (!userId) {
        throw new Error("Kullanıcı oluşturulamadı. Lütfen tekrar deneyin.");
      }

      const { error: profileError } = await supabase.from("users").insert({
        id: userId,
        username: cleanedUsername,
        role: "producer",
      });

      if (profileError) {
        throw profileError;
      }

      router.push("/dashboard/producer");
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
          <p className="text-sm uppercase tracking-widest text-amber-300">
            Ducktylo
          </p>
          <h1 className="text-3xl font-semibold">Yapımcı Kayıt</h1>
          <p className="text-slate-300">Yeni projeler bulmak için kayıt ol.</p>
        </div>

        <form onSubmit={handleSignUp} className="mt-8 space-y-4">
          <label className="block text-sm font-medium text-slate-200">
            Firma / Profil Adı
            <input
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              required
              className="mt-2 w-full rounded-lg border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-amber-300 focus:outline-none"
              placeholder="ornek-yapim"
            />
          </label>

          <label className="block text-sm font-medium text-slate-200">
            E-posta
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="mt-2 w-full rounded-lg border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-amber-300 focus:outline-none"
              placeholder="yapimci@ducktylo.com"
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
              className="mt-2 w-full rounded-lg border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-amber-300 focus:outline-none"
              placeholder="••••••••"
            />
          </label>

          {error ? (
            <p className="text-sm text-red-400">{error}</p>
          ) : (
            <p className="text-xs text-slate-400">
              Hesap açarak gizlilik politikamızı kabul etmiş olursun.
            </p>
          )}

          <button
            type="submit"
            className="w-full rounded-lg bg-amber-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:bg-amber-300/60"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Kaydediliyor..." : "Stüdyona Üye Ol"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-400">
          Hesabın var mı? {" "}
          <Link href="/auth/sign-in" className="text-amber-300 hover:underline">
            Giriş yap
          </Link>
        </p>
      </div>
    </main>
  );
}
