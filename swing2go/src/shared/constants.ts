/** Fast fraktavgift i öre (29 kr). Används av Workern när ordern skapas. */
export const SHIPPING_ORE = 2900;

export const PACK_SIZES = [6, 12] as const;
export const GRADES = ["A", "B", "C"] as const;
export const ORDER_STATUSES = ["ny", "packas", "skickad", "levererad", "avbruten"] as const;
