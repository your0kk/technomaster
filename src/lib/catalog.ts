import "server-only";
import { publicDb } from "./supabase/server";
import { demoParts, demoServices } from "./demo";
import type { Part, Service } from "./types";
export async function catalogData() {
  const db = publicDb();
  if (!db)
    return {
      parts: demoParts,
      services: demoServices,
      demo: true,
      error: false,
    };
  const [parts, services] = await Promise.all([
    db
      .from("parts")
      .select(
        "id,title,article,category,brand,compatible_models,price,stock_quantity,image_url,is_active",
      )
      .eq("is_active", true)
      .order("title"),
    db
      .from("services")
      .select("id,title,description,price_from,is_active")
      .eq("is_active", true)
      .order("created_at"),
  ]);
  if (parts.error || services.error)
    return {
      parts: [] as Part[],
      services: [] as Service[],
      demo: false,
      error: true,
    };
  return {
    parts: parts.data as Part[],
    services: services.data as Service[],
    demo: false,
    error: false,
  };
}
