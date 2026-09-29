import { NextRequest, NextResponse } from "next/server";
import { orderSchema } from "@/lib/validation";
import { privateDb, publicDb } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const db = privateDb();
  if (!db)
    return NextResponse.json(
      { error: "Сервис временно недоступен" },
      { status: 503 },
    );

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Не удалось прочитать заказ" },
      { status: 400 },
    );
  }
  const parsed = orderSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Проверьте данные заказа" },
      { status: 400 },
    );

  let clientId: string | null = null;
  const token = request.headers
    .get("authorization")
    ?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (token) {
    const auth = publicDb();
    if (!auth)
      return NextResponse.json(
        { error: "Сервис временно недоступен" },
        { status: 503 },
      );
    const { data: authData, error: authError } = await auth.auth.getUser(token);
    if (authError || !authData?.user)
      return NextResponse.json(
        { error: "Сессия закончилась. Войдите ещё раз." },
        { status: 401 },
      );
    const { data: profile, error: profileError } = await db
      .from("users")
      .select("id,role")
      .eq("auth_user_id", authData.user.id)
      .maybeSingle();
    if (profileError || profile?.role !== "client")
      return NextResponse.json(
        { error: "Заказ можно оформить из клиентского кабинета" },
        { status: 403 },
      );
    clientId = profile.id;
  }

  const { data, error } = await db.rpc("create_order", {
    customer_id: clientId,
    customer_name_input: parsed.data.customer_name,
    customer_phone_input: parsed.data.customer_phone,
    delivery_method_input: parsed.data.delivery_method,
    delivery_address_input: parsed.data.delivery_address,
    comment_input: parsed.data.comment,
    items_input: parsed.data.items,
  });
  if (error)
    return NextResponse.json(
      {
        error: error.message.includes("доступны")
          ? error.message
          : "Не удалось оформить заказ. Проверьте наличие и повторите попытку.",
      },
      { status: 409 },
    );
  return NextResponse.json({ id: data }, { status: 201 });
}
