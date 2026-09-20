import { z } from "zod";
import { PACK_SIZES } from "./constants";

// Alla felmeddelanden är på svenska.
export const orderItemSchema = z.object({
  variantId: z.string().uuid("Ogiltig produktvariant."),
  quantity: z
    .number({ invalid_type_error: "Antal måste vara ett tal." })
    .int("Antal måste vara ett heltal.")
    .min(1, "Antal måste vara minst 1.")
    .max(20, "Du kan högst köpa 20 förpackningar per rad."),
});

export const createOrderSchema = z.object({
  customer: z.object({
    name: z.string().trim().min(2, "Ange ditt namn."),
    email: z.string().trim().email("Ange en giltig e-postadress."),
    phone: z.string().trim().min(6, "Ange ett giltigt telefonnummer.").optional(),
    street: z.string().trim().min(3, "Ange din adress."),
    postalCode: z
      .string()
      .trim()
      .regex(/^\d{3}\s?\d{2}$/, "Ange postnummer med fem siffror."),
    city: z.string().trim().min(2, "Ange din ort."),
  }),
  items: z.array(orderItemSchema).min(1, "Din varukorg är tom.").max(50),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export const packSizeSchema = z.union([z.literal(PACK_SIZES[0]), z.literal(PACK_SIZES[1])]);
