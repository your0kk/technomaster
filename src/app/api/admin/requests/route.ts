import { NextRequest, NextResponse } from "next/server";
import { adminRequestUpdateSchema } from "@/lib/validation";
import { privateDb, publicDb } from "@/lib/supabase/server";

async function adminContext(request: NextRequest) {
  const token = request.headers
    .get("authorization")
    ?.match(/^Bearer\s+(.+)$/i)?.[1];
  const auth = publicDb();
  const db = privateDb();
  if (!token || !auth || !db)
    return { error: "Необходим вход администратора", status: 401 } as const;
  const { data, error } = await auth.auth.getUser(token);
  if (error || !data.user)
    return { error: "Сессия истекла. Войдите снова.", status: 401 } as const;
  const { data: profile, error: profileError } = await db
    .from("users")
    .select("role")
    .eq("auth_user_id", data.user.id)
    .maybeSingle();
  if (profileError || profile?.role !== "admin")
    return {
      error: "Нет доступа: требуется роль администратора",
      status: 403,
    } as const;
  return { db } as const;
}

export async function GET(request: NextRequest) {
  const context = await adminContext(request);
  const headers = { "Cache-Control": "no-store" };
  if ("error" in context)
    return NextResponse.json(
      { error: context.error },
      { status: context.status, headers },
    );
  try {
    const [requestsResult, mastersResult] = await Promise.all([
      context.db
        .from("repair_requests")
        .select(
          "id,customer_name,customer_phone,address,appliance_type,appliance_brand,appliance_model,issue_description,preferred_date,preferred_time,status,created_at,master_id",
        )
        .order("created_at", { ascending: false })
        .limit(100),
      context.db
        .from("users")
        .select("id,full_name,phone")
        .eq("role", "master")
        .order("full_name"),
    ]);
    if (requestsResult.error || mastersResult.error) throw Error();
    return NextResponse.json(
      { requests: requestsResult.data, masters: mastersResult.data },
      { headers },
    );
  } catch {
    return NextResponse.json(
      { error: "Не удалось загрузить заявки. Проверьте БД." },
      { status: 503, headers },
    );
  }
}

export async function PATCH(request: NextRequest) {
  const context = await adminContext(request);
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
  const parsed = adminRequestUpdateSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Проверьте данные" },
      { status: 400 },
    );
  if (parsed.data.master_id) {
    const { data: master, error } = await context.db
      .from("users")
      .select("id")
      .eq("id", parsed.data.master_id)
      .eq("role", "master")
      .maybeSingle();
    if (error || !master)
      return NextResponse.json({ error: "Мастер не найден" }, { status: 400 });
  }
  const { data, error } = await context.db
    .from("repair_requests")
    .update({ master_id: parsed.data.master_id, status: parsed.data.status })
    .eq("id", parsed.data.id)
    .select("id,master_id,status")
    .single();
  if (error)
    return NextResponse.json(
      { error: "Не удалось сохранить заявку" },
      { status: 409 },
    );
  return NextResponse.json({ request: data });
}
