import { NextRequest, NextResponse } from "next/server";
import { privateDb, publicDb } from "@/lib/supabase/server";
import { profileSchema } from "@/lib/validation";

export const runtime = "nodejs";

async function clientProfile(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const auth = publicDb();
  const db = privateDb();
  if (!token || !auth || !db) return { error: "Войдите в личный кабинет", status: 401 } as const;

  const { data: authData, error: authError } = await auth.auth.getUser(token);
  if (authError || !authData.user)
    return { error: "Сессия закончилась. Войдите ещё раз", status: 401 } as const;

  const { data: profile, error: profileError } = await db
    .from("users")
    .select("id,full_name,phone,email,role")
    .eq("auth_user_id", authData.user.id)
    .maybeSingle();
  if (profileError || !profile)
    return { error: "Профиль не найден", status: 404 } as const;
  if (profile.role !== "client")
    return { error: "Этот кабинет предназначен для клиентов", status: 403 } as const;

  return { db, profile, authUser: authData.user } as const;
}

export async function GET(request: NextRequest) {
  const context = await clientProfile(request);
  if ("error" in context)
    return NextResponse.json({ error: context.error }, { status: context.status });

  const [requestsResult, ordersResult] = await Promise.all([
    context.db
      .from("repair_requests")
      .select("id,appliance_type,appliance_brand,appliance_model,issue_description,preferred_date,preferred_time,status,created_at")
      .eq("client_id", context.profile.id)
      .order("created_at", { ascending: false }),
    context.db
      .from("orders")
      .select("id,status,total_amount,delivery_method,created_at")
      .eq("client_id", context.profile.id)
      .order("created_at", { ascending: false }),
  ]);
  if (requestsResult.error || ordersResult.error)
    return NextResponse.json({ error: "Не удалось загрузить данные кабинета" }, { status: 503 });

  return NextResponse.json(
    {
      profile: context.profile,
      requests: requestsResult.data,
      orders: ordersResult.data,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function PATCH(request: NextRequest) {
  const context = await clientProfile(request);
  if ("error" in context)
    return NextResponse.json({ error: context.error }, { status: context.status });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Не удалось прочитать форму" }, { status: 400 });
  }
  const parsed = profileSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json(
      { error: "Проверьте имя и телефон", fields: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );

  const { data, error } = await context.db
    .from("users")
    .update(parsed.data)
    .eq("id", context.profile.id)
    .select("id,full_name,phone,email,role")
    .single();
  if (error)
    return NextResponse.json({ error: "Не удалось сохранить профиль" }, { status: 503 });
  return NextResponse.json({ profile: data });
}
