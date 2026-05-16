import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/navbar/Navbar";
import { Toaster } from "react-hot-toast";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "MovieKart — AI-Powered Movie Discovery",
  description: "Your personalized movie discovery platform. Get AI recommendations, taste analysis, and connect with users who share your cinematic taste.",
};

import { UserProvider } from "@/components/providers/UserProvider";

import Footer from "@/components/Footer";

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-black">
        <UserProvider>
          <Navbar />
          <main className="flex-1 pt-20">
            {children}
          </main>
          <Footer />
          <Toaster position="bottom-right" toastOptions={{ style: { background: '#18181b', color: '#fff' } }} />
        </UserProvider>
      </body>
    </html>
  );
}
