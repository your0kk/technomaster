import { test } from "node:test";
import assert from "node:assert/strict";
import {
  bookingSchema,
  localDate,
  registrationSchema,
} from "../src/lib/validation";
const valid = {
  customer_name: "Учебный клиент",
  customer_phone: "8 (900) 000-00-00",
  address: "Коченёво, ул. Примерная, 12",
  appliance_type: "Стиральная машина",
  appliance_brand: "Samsung",
  appliance_model: "Не знаю",
  service_id: "10000000-0000-4000-8000-000000000001",
  issue_description: "Не сливает воду после стирки",
  preferred_date: localDate(),
  preferred_time: "14:00–17:00",
  consent: true,
};
test("valid request normalizes phone", () =>
  assert.equal(bookingSchema.parse(valid).customer_phone, "+79000000000"));
test("rejects past or impossible date and invalid phone", () => {
  for (const patch of [
    { preferred_date: "2000-01-01" },
    { preferred_date: "2027-02-30" },
    { customer_phone: "123" },
  ])
    assert.equal(
      bookingSchema.safeParse({ ...valid, ...patch }).success,
      false,
    );
});
test("does not accept role/status injection or missing consent", () => {
  for (const patch of [
    { status: "completed" },
    { master_id: "30000000-0000-4000-8000-000000000002" },
    { consent: false },
    { issue_description: "x" },
  ])
    assert.equal(
      bookingSchema.safeParse({ ...valid, ...patch }).success,
      false,
    );
});
test("registration checks phone and matching passwords", () => {
  const registration = {
    full_name: "Мария Петрова",
    phone: "8 (900) 111-22-33",
    email: "maria@example.com",
    password: "ordinary-password",
    password_confirm: "ordinary-password",
  };
  assert.equal(
    registrationSchema.parse(registration).phone,
    "+79001112233",
  );
  assert.equal(
    registrationSchema.safeParse({
      ...registration,
      password_confirm: "different-password",
    }).success,
    false,
  );
});
