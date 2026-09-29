import { NextRequest, NextResponse } from "next/server";
import { registrationSchema } from "@/lib/validation";
import { privateDb } from "@/lib/supabase/server";

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
      { error: "Не удалось прочитать форму" },
      { status: 400 },
    );
  }
  const parsed = registrationSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json(
      {
        error: "Проверьте поля формы",
        fields: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  const { full_name, phone, email, password } = parsed.data;
  const { error } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name, phone },
  });
  if (error) {
    if (error.message.toLowerCase().includes("already"))
      return NextResponse.json(
        { error: "Учётная запись с такой почтой уже существует." },
        { status: 409 },
      );
    return NextResponse.json(
      { error: "Не удалось создать учётную запись" },
      { status: 503 },
    );
  }
  return NextResponse.json({ ok: true }, { status: 201 });
}
