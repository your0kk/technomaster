import { z } from "zod";
export const timeSlots = [
  "09:00–12:00",
  "12:00–14:00",
  "14:00–17:00",
  "17:00–19:00",
] as const;
export function localDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Novosibirsk",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
export const bookingSchema = z
  .object({
    customer_name: z
      .string()
      .trim()
      .min(2, "Укажите имя, минимум 2 символа")
      .max(120),
    customer_phone: z
      .string()
      .trim()
      .max(30)
      .transform((v) => v.replace(/[\s()\-]/g, ""))
      .refine(
        (v) => /^(?:\+7|8)\d{10}$/.test(v),
        "Введите российский номер: +7 и 10 цифр",
      )
      .transform((v) => (v.startsWith("8") ? "+7" + v.slice(1) : v)),
    address: z
      .string()
      .trim()
      .min(8, "Укажите населённый пункт, улицу и дом")
      .max(500),
    appliance_type: z.enum([
      "Стиральная машина",
      "Посудомоечная машина",
      "Холодильник",
      "Духовой шкаф",
      "Другая техника",
    ]),
    appliance_brand: z.string().trim().max(80).default(""),
    appliance_model: z
      .string()
      .trim()
      .min(1, "Укажите модель или «Не знаю»")
      .max(120),
    service_id: z.uuid("Выберите услугу"),
    issue_description: z
      .string()
      .trim()
      .min(10, "Опишите неисправность, минимум 10 символов")
      .max(2000),
    preferred_date: z.iso
      .date("Укажите корректную дату")
      .refine((v) => v >= localDate(), "Выберите сегодняшнюю или будущую дату")
      .refine(
        (v) =>
          v <= new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10),
        "Выберите дату в ближайшие 90 дней",
      ),
    preferred_time: z.enum(timeSlots),
    consent: z.literal(true, { error: "Нужно согласие на обработку данных" }),
  })
  .strict();
export type BookingInput = z.input<typeof bookingSchema>;

const russianPhone = z
  .string()
  .trim()
  .max(30)
  .transform((v) => v.replace(/[\s()\-]/g, ""))
  .refine((v) => /^(?:\+7|8)\d{10}$/.test(v), "Введите номер в формате +7")
  .transform((v) => (v.startsWith("8") ? "+7" + v.slice(1) : v));

export const registrationSchema = z
  .object({
    full_name: z.string().trim().min(2, "Укажите имя").max(120),
    phone: russianPhone,
    email: z.email("Проверьте адрес почты").max(254),
    password: z.string().min(8, "Минимум 8 символов").max(72),
    password_confirm: z.string(),
  })
  .refine((value) => value.password === value.password_confirm, {
    message: "Пароли не совпадают",
    path: ["password_confirm"],
  });

export const profileSchema = z.object({
  full_name: z.string().trim().min(2, "Укажите имя").max(120),
  phone: russianPhone,
});

export const orderSchema = z
  .object({
    customer_name: z.string().trim().min(2, "Укажите имя").max(120),
    customer_phone: russianPhone,
    delivery_method: z.enum(["pickup", "delivery"]),
    delivery_address: z.string().trim().max(500).optional().default(""),
    comment: z.string().trim().max(1000).optional().default(""),
    items: z
      .array(
        z.object({
          part_id: z.uuid("Некорректная запчасть"),
          quantity: z.number().int().min(1).max(20),
        }),
      )
      .min(1, "Корзина пуста")
      .max(20, "Слишком много позиций"),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (
      value.delivery_method === "delivery" &&
      value.delivery_address.length < 8
    )
      ctx.addIssue({
        code: "custom",
        path: ["delivery_address"],
        message: "Укажите населённый пункт, улицу и дом",
      });
  });

export const adminRequestUpdateSchema = z
  .object({
    id: z.uuid(),
    master_id: z.uuid().nullable(),
    status: z.enum([
      "new",
      "confirmed",
      "assigned",
      "in_progress",
      "waiting_part",
      "completed",
      "cancelled",
    ]),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (
      ["assigned", "in_progress", "waiting_part", "completed"].includes(
        value.status,
      ) &&
      !value.master_id
    )
      ctx.addIssue({
        code: "custom",
        path: ["master_id"],
        message: "Назначьте мастера",
      });
  });

export const masterRequestUpdateSchema = z
  .object({
    id: z.uuid(),
    status: z.enum(["in_progress", "waiting_part", "completed"]),
  })
  .strict();
