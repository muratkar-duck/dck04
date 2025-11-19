import type { Metadata } from "next";
import "./globals.css";

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
        {children}
      </body>
    </html>
  );
}
