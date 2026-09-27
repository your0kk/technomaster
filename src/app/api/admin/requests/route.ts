import { NextRequest, NextResponse } from "next/server";
import { publicDb, privateDb } from "@/lib/supabase/server";
export async function GET(request: NextRequest) {
  const headers = { "Cache-Control": "no-store" };
  const token = request.headers
    .get("authorization")
    ?.match(/^Bearer (.+)$/)?.[1];
  if (!token)
    return NextResponse.json(
      { error: "Необходим вход администратора" },
      { status: 401, headers },
    );
  const auth = publicDb(),
    db = privateDb();
  if (!auth || !db)
    return NextResponse.json(
      { error: "Supabase ещё не настроен" },
      { status: 503, headers },
    );
  try {
    const { data, error } = await auth.auth.getUser(token);
    if (error || !data.user)
      return NextResponse.json(
        { error: "Сессия истекла. Войдите снова." },
        { status: 401, headers },
      );
    const { data: profile, error: profileError } = await db
      .from("users")
      .select("role")
      .eq("auth_user_id", data.user.id)
      .maybeSingle();
    if (profileError) throw profileError;
    if (profile?.role !== "admin")
      return NextResponse.json(
        { error: "Нет доступа: требуется роль администратора" },
        { status: 403, headers },
      );
    const { data: requests, error: queryError } = await db
      .from("repair_requests")
      .select(
        "id,customer_name,customer_phone,address,appliance_type,appliance_brand,appliance_model,issue_description,preferred_date,preferred_time,status,created_at,master_id",
      )
      .order("created_at", { ascending: false })
      .limit(100);
    if (queryError) throw queryError;
    return NextResponse.json({ requests }, { headers });
  } catch {
    return NextResponse.json(
      { error: "Не удалось загрузить заявки. Проверьте БД." },
      { status: 503, headers },
    );
  }
}
