import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { AuthProvider } from "@/app/components/layout/auth-provider";
import { Footer } from "@/app/components/layout/footer";
import { Header } from "@/app/components/layout/header";
import { getSession } from "@/lib/auth/session";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Neuro Track Front",
  description: "Plataforma interna de inteligencia populacional com autenticacao protegida.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();

  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-slate-950 text-white">
        <AuthProvider initialUser={session?.user ?? null}>
          <div className="relative flex min-h-screen flex-col bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.14),transparent_35%),radial-gradient(circle_at_bottom,rgba(168,85,247,0.14),transparent_30%),linear-gradient(180deg,#020617_0%,#020617_38%,#111827_100%)]">
            <Header />
            <main className="flex flex-1 flex-col">{children}</main>
            <Footer />
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
