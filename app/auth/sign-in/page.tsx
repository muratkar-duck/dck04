"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { getBrowserSupabaseClient } from "@/lib/supabaseClient";

export default function SignInPage() {
  const router = useRouter();
  const supabase = getBrowserSupabaseClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSignIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        throw signInError;
      }

      const user = data.user;

      if (!user) {
        throw new Error("Giriş başarısız. Lütfen bilgilerini kontrol et.");
      }

      const { data: profile, error: profileError } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profileError) {
        throw profileError;
      }

      const role = profile?.role ?? "writer";
      const destination = role === "producer" ? "/dashboard/producer" : "/dashboard/writer";

      router.push(destination);
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
