import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import BottomNav from "@/components/Navigation/BottomNav";
import AuthModal from "@/components/Auth/AuthModal";
import AuthProvider from "@/components/Auth/AuthProvider";
import AuthGuard from "@/components/Auth/AuthGuard";
import NotifProvider from "@/components/Providers/NotifProvider";
import { Toaster } from "react-hot-toast";

const inter = Inter({ 
  subsets: ["latin"],
  display: 'swap',
  preload: true 
});

export const metadata: Metadata = {
  title: "TikTok Clone - Pour toi",
  description: "Découvrez les meilleures vidéos courtes sur TikTok Clone.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="dark">
      <head>
        <link rel="preconnect" href={process.env.NEXT_PUBLIC_SUPABASE_URL} />
        <link rel="dns-prefetch" href={process.env.NEXT_PUBLIC_SUPABASE_URL} />
      </head>
      <body className={`${inter.className} bg-black text-white h-[100dvh] overflow-hidden selection:bg-tiktok-pink/30 antialiased`}>
        <AuthProvider>
          <AuthGuard>
             <NotifProvider>
                <main className="h-full w-full max-w-[500px] mx-auto relative overflow-hidden bg-black shadow-2xl shadow-white/5">
                  {children}
                </main>
                <BottomNav />
                <AuthModal />
                <Toaster 
                  position="top-center" 
                  toastOptions={{
                    style: { 
                      background: '#121212', 
                      color: '#fff', 
                      border: '1px solid #333',
                      borderRadius: '12px',
                      fontSize: '14px',
                    } 
                  }} 
                />
             </NotifProvider>
          </AuthGuard>
        </AuthProvider>
      </body>
    </html>
  );
}
