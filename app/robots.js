import { SITE_URL } from "@/lib/seo.config";

export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/auth/",
          "/settings/",
          "/favorites/",
          "/watchlist/",
          "/watched/",
          "/feed/",
          "/collection/",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
