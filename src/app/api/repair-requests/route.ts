import { NextRequest, NextResponse } from "next/server";
import { bookingSchema } from "@/lib/validation";
import { privateDb, publicDb } from "@/lib/supabase/server";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  // Next.js may normalize the development URL to localhost. The Host
  // header preserves the address actually used by the browser (127.0.0.1).
  const expectedOrigin = `${request.nextUrl.protocol}//${request.headers.get("host") ?? request.nextUrl.host}`;
  if (origin && origin !== expectedOrigin)
    return NextResponse.json(
      { error: "Недопустимый источник запроса" },
      { status: 403 },
    );
  if (!request.headers.get("content-type")?.includes("application/json"))
    return NextResponse.json({ error: "Ожидается JSON" }, { status: 415 });
  let body: unknown;
  try {
    // Bound the actual stream, including requests without Content-Length.
    const reader = request.body?.getReader();
    if (!reader) throw Error();
    let length = 0;
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 16384) {
        await reader.cancel();
        return NextResponse.json(
          { error: "Заявка слишком большая" },
          { status: 413 },
        );
      }
      chunks.push(value);
    }
    body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return NextResponse.json(
      { error: "Не удалось прочитать данные формы" },
      { status: 400 },
    );
  }
  const parsed = bookingSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json(
      {
        error: "Проверьте поля формы",
        fields: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  const db = privateDb();
  if (!db)
    return NextResponse.json(
      {
        error:
          "База данных ещё не подключена. Заявка не сохранена. Настройте Supabase по инструкции проекта.",
      },
      { status: 503 },
    );
  try {
    let clientId: string | null = null;
    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (token) {
      const auth = publicDb();
      const { data: authData, error: authError } = auth
        ? await auth.auth.getUser(token)
        : { data: { user: null }, error: Error("Auth unavailable") };
      if (authError || !authData.user)
        return NextResponse.json(
          { error: "Сессия закончилась. Войдите ещё раз или отправьте заявку как гость." },
          { status: 401 },
        );
      const { data: profile } = await db
        .from("users")
        .select("id,role")
        .eq("auth_user_id", authData.user.id)
        .maybeSingle();
      if (profile?.role === "client") clientId = profile.id;
    }
    const { data: service, error: lookupError } = await db
      .from("services")
      .select("id")
      .eq("id", parsed.data.service_id)
      .eq("is_active", true)
      .maybeSingle();
    if (lookupError) throw lookupError;
    if (!service)
      return NextResponse.json(
        { error: "Услуга недоступна. Обновите страницу и выберите другую." },
        { status: 400 },
      );
    const { consent, ...values } = parsed.data;
    void consent;
    const { data, error } = await db
      .from("repair_requests")
      .insert({ ...values, client_id: clientId, status: "new" })
      .select("id,status")
      .single();
    if (error) throw error;
    return NextResponse.json(
      { id: data.id, status: data.status },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      {
        error:
          "Не удалось сохранить заявку. Проверьте подключение к БД и миграцию. Попробуйте ещё раз.",
      },
      { status: 503 },
    );
  }
}
