import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/navbar/Navbar";
import { Toaster } from "react-hot-toast";
import JsonLd from "@/components/JsonLd";
import {
  SITE_URL,
  SITE_NAME,
  SITE_TAGLINE,
  SITE_DESCRIPTION,
  DEFAULT_OG_IMAGE,
} from "@/lib/seo.config";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — ${SITE_TAGLINE}`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "MovieKart",
    "movie kart",
    "movie discovery",
    "AI movie recommendations",
    "movie tracker",
    "movie collections",
    "watchlist",
    "movie reviews",
    "trending movies",
    "personalized movie suggestions",
    "film discovery platform",
    "movie social network",
  ],
  authors: [{ name: "Aryan Sinha" }],
  creator: "Aryan Sinha",
  publisher: SITE_NAME,
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: DEFAULT_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: `${SITE_NAME} — ${SITE_TAGLINE}`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    images: [DEFAULT_OG_IMAGE],
  },
  alternates: {
    canonical: SITE_URL,
  },
  other: {
    "google-site-verification": "", // Add your Search Console verification code here
  },
};

import { UserProvider } from "@/components/providers/UserProvider";
import { RecentSearchesProvider } from "@/components/providers/RecentSearchesProvider";

import Footer from "@/components/Footer";

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${SITE_URL}/?q={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE_NAME,
  url: SITE_URL,
  logo: `${SITE_URL}/icon.png`,
  description: SITE_DESCRIPTION,
  founder: {
    "@type": "Person",
    name: "Aryan Sinha",
  },
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-black">
        <JsonLd data={websiteJsonLd} />
        <JsonLd data={organizationJsonLd} />
        <UserProvider>
          <RecentSearchesProvider>
            <Navbar />
            <main className="flex-1">
              {children}
            </main>
            <Footer />
            <Toaster position="bottom-right" toastOptions={{ style: { background: '#18181b', color: '#fff' } }} />
          </RecentSearchesProvider>
        </UserProvider>
      </body>
    </html>
  );
}
