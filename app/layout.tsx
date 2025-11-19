import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import { SignOutButton } from "@/components/sign-out-button";

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
            <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4">
              <Link href="/" className="text-lg font-semibold tracking-tight">
                Ducktylo
              </Link>
              <SignOutButton />
            </div>
          </header>
          <main className="flex flex-1 flex-col">{children}</main>
        </div>
      </body>
    </html>
  );
}
