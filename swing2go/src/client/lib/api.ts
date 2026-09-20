import type { CreateOrderInput } from "@shared/validation";
import { supabase } from "./supabase";

export class ApiFel extends Error {
  constructor(
    message: string,
    public status: number,
    public falt: Record<string, string> = {},
  ) {
    super(message);
  }
}

async function authHeader(): Promise<Record<string, string>> {
  if (!supabase) return {};
  const { data } = await supabase.auth.getSession();
  return data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {};
}

export async function skapaOrder(input: CreateOrderInput): Promise<{ orderNumber: number; totalOre: number }> {
  let svar: Response;
  try {
    svar = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeader()) },
      body: JSON.stringify(input),
    });
  } catch {
    throw new ApiFel("Vi når inte servern. Kontrollera din uppkoppling och försök igen.", 0);
  }

  const data = (await svar.json().catch(() => ({}))) as {
    fel?: string;
    falt?: Record<string, string>;
    orderNumber?: number;
    totalOre?: number;
  };

  if (!svar.ok || data.orderNumber === undefined || data.totalOre === undefined) {
    throw new ApiFel(data.fel ?? "Något gick fel. Försök igen.", svar.status, data.falt);
  }
  return { orderNumber: data.orderNumber, totalOre: data.totalOre };
}
