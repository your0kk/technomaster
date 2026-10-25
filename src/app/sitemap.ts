import type { MetadataRoute } from "next";
import { catalogData } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { parts, error } = await catalogData();
  if (error) {
    throw new Error("Не удалось загрузить каталог для карты сайта");
  }
  const site = "https://example.com";
  return [
    { url: `${site}/` },
    { url: `${site}/services` },
    { url: `${site}/parts` },
    ...parts.map((part) => ({ url: `${site}/parts/${part.id}` })),
  ];
}
