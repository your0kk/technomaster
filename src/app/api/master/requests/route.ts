import { NextRequest, NextResponse } from "next/server";
import { masterRequestUpdateSchema } from "@/lib/validation";
import { privateDb, publicDb } from "@/lib/supabase/server";

async function masterContext(request: NextRequest) {
  const token = request.headers
    .get("authorization")
    ?.match(/^Bearer\s+(.+)$/i)?.[1];
  const auth = publicDb();
  const db = privateDb();
  if (!token || !auth || !db)
    return { error: "Необходим вход мастера", status: 401 } as const;
  const { data, error } = await auth.auth.getUser(token);
  if (error || !data.user)
    return { error: "Сессия истекла. Войдите снова.", status: 401 } as const;
  const { data: profile, error: profileError } = await db
    .from("users")
    .select("id,full_name,phone,role")
    .eq("auth_user_id", data.user.id)
    .maybeSingle();
  if (profileError || profile?.role !== "master")
    return {
      error: "Нет доступа: требуется роль мастера",
      status: 403,
    } as const;
  return { db, profile } as const;
}

export async function GET(request: NextRequest) {
  const context = await masterContext(request);
  if ("error" in context)
    return NextResponse.json(
      { error: context.error },
      { status: context.status },
    );
  const { data, error } = await context.db
    .from("repair_requests")
    .select(
      "id,customer_name,customer_phone,address,appliance_type,appliance_brand,appliance_model,issue_description,preferred_date,preferred_time,status,created_at,master_id",
    )
    .eq("master_id", context.profile.id)
    .order("preferred_date")
    .order("preferred_time");
  if (error)
    return NextResponse.json(
      { error: "Не удалось загрузить выезды" },
      { status: 503 },
    );
  return NextResponse.json(
    { profile: context.profile, requests: data },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function PATCH(request: NextRequest) {
  const context = await masterContext(request);
  if ("error" in context)
    return NextResponse.json(
      { error: context.error },
      { status: context.status },
    );
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Не удалось прочитать изменение" },
      { status: 400 },
    );
  }
  const parsed = masterRequestUpdateSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "Недопустимый статус" }, { status: 400 });
  const { data, error } = await context.db
    .from("repair_requests")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.id)
    .eq("master_id", context.profile.id)
    .select("id,status")
    .maybeSingle();
  if (error || !data)
    return NextResponse.json({ error: "Заявка не найдена" }, { status: 404 });
  return NextResponse.json({ request: data });
}
