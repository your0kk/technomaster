import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      disallow: [
        "/account",
        "/admin",
        "/master",
        "/login",
        "/cart",
        "/checkout",
        "/request",
        "/api/",
        "/parts?*q=",
        "/parts?*category=",
      ],
    },
    sitemap: "https://example.com/sitemap.xml",
  };
}
