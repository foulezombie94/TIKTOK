import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import BottomNav from "@/components/Navigation/BottomNav";
import AuthModal from "@/components/Auth/AuthModal";
import AuthProvider from "@/components/Auth/AuthProvider";

export const metadata: Metadata = {
  title: "TikTok Clone",
  description: "A TikTok clone built with Next.js and Supabase",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="dark">
      <body className="bg-black text-white overflow-hidden h-[100dvh] w-full">
        <AuthProvider>
          <main className="relative h-[100dvh] w-full max-w-[500px] mx-auto overflow-hidden">
            {children}
            <BottomNav />
            <AuthModal />
          </main>
          <Toaster
            position="top-center"
            toastOptions={{
              style: {
                background: '#1a1a1a',
                color: '#fff',
                border: '1px solid #333',
                borderRadius: '12px',
                fontSize: '14px',
              },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}
