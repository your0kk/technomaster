export type Service = {
  id: string;
  title: string;
  description: string;
  price_from: number;
  is_active: boolean;
};
export type Part = {
  id: string;
  title: string;
  article: string;
  category: string;
  brand: string;
  compatible_models: string[];
  price: number;
  stock_quantity: number;
  image_url: string | null;
  is_active: boolean;
};
export const statuses = {
  new: "Новая",
  confirmed: "Подтверждена",
  assigned: "Мастер назначен",
  in_progress: "В работе",
  waiting_part: "Ожидает запчасть",
  completed: "Завершена",
  cancelled: "Отменена",
} as const;
export type RepairStatus = keyof typeof statuses;
export type RepairRequest = {
  id: string;
  customer_name: string;
  customer_phone: string;
  address: string;
  appliance_type: string;
  appliance_brand: string;
  appliance_model: string;
  issue_description: string;
  preferred_date: string;
  preferred_time: string;
  status: RepairStatus;
  created_at: string;
  master_id: string | null;
};
export const money = (n: number) =>
  new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(n);
