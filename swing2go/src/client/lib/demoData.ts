import type { Grade, PackSize, Product } from "@shared/types";

// DEMO-DATA. Priser och lager är påhittade platshållare.
// Visas bara när Supabase inte är kopplat.
const perBoll: Record<Grade, number> = { A: 1000, B: 750, C: 500 };

function demo(id: number, brand: string, model: string, slug: string, grade: Grade): Product {
  const sizes: PackSize[] = [6, 12];
  return {
    id: `demo-${id}`,
    slug,
    brand,
    model,
    description: "Demoprodukt. Byt ut texten i adminpanelen.",
    grade,
    images: [],
    isDemo: true,
    variants: sizes.map((packSize) => ({
      id: `demo-${id}-${packSize}`,
      packSize,
      priceOre: perBoll[grade] * packSize,
      stock: id === 8 ? 0 : id === 4 ? 3 : 12,
    })),
  };
}

export const demoProducts: Product[] = [
  demo(1, "Titleist", "Pro V1", "titleist-pro-v1-a", "A"),
  demo(2, "Titleist", "Pro V1x", "titleist-pro-v1x-b", "B"),
  demo(3, "Callaway", "Chrome Soft", "callaway-chrome-soft-a", "A"),
  demo(4, "Callaway", "Supersoft", "callaway-supersoft-c", "C"),
  demo(5, "TaylorMade", "TP5", "taylormade-tp5-b", "B"),
  demo(6, "TaylorMade", "Tour Response", "taylormade-tour-response-a", "A"),
  demo(7, "Srixon", "Z-Star", "srixon-z-star-b", "B"),
  demo(8, "Srixon", "Soft Feel", "srixon-soft-feel-c", "C"),
  demo(9, "Bridgestone", "Tour B X", "bridgestone-tour-b-x-b", "B"),
];
