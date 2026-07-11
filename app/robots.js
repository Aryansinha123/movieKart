import { SITE_URL } from "@/lib/seo.config";

export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/movie/",
          "/collection/",
          "/collections",
        ],
        disallow: [
          "/api/",
          "/auth/",
          "/settings/",
          "/favorites/",
          "/watchlist/",
          "/watched/",
          "/feed/",
          "/profile/",
          "/login",
          "/register",
          "/search",
          "/admin",
          "/dashboard",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
