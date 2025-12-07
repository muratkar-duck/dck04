import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import { HeaderAuthActions } from "@/components/header-auth-actions";

export const metadata: Metadata = {
  title: "Ducktylo",
  description: "Ducktylo pazaryeri uygulaması için temel Next.js iskeleti.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <body className="min-h-screen bg-slate-950 text-white antialiased">
        <div className="flex min-h-screen flex-col">
          <header className="border-b border-white/5 bg-slate-900/40 backdrop-blur">
            <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4 gap-4">
              <div className="flex items-center gap-6">
                <Link href="/" className="text-lg font-semibold tracking-tight">
                  Ducktylo
                </Link>
                <nav className="hidden text-sm text-slate-300 sm:flex sm:items-center sm:gap-4">
                  <Link href="/dashboard/writer/scripts" className="transition hover:text-white">
                    Yazar Paneli
                  </Link>
                  <Link href="/dashboard/producer" className="transition hover:text-white">
                    Yapımcı Paneli
                  </Link>
                </nav>
              </div>
              <HeaderAuthActions />
            </div>
          </header>
          <main className="flex flex-1 flex-col">{children}</main>
        </div>
      </body>
    </html>
  );
}
