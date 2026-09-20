import { useEffect, useState } from "react";
import type { Grade, PackSize, Product } from "@shared/types";
import { bildUrl, harSupabase, supabase } from "@/lib/supabase";
import { demoProducts } from "@/lib/demoData";

interface Rad {
  id: string;
  slug: string;
  model: string;
  description: string;
  grade: Grade;
  is_demo: boolean;
  brands: { name: string } | null;
  product_variants: { id: string; pack_size: number; price_ore: number; stock: number }[];
  product_images: { storage_path: string; sort_order: number }[];
}

function tillProdukt(r: Rad): Product {
  return {
    id: r.id,
    slug: r.slug,
    brand: r.brands?.name ?? "",
    model: r.model,
    description: r.description,
    grade: r.grade,
    isDemo: r.is_demo,
    images: [...r.product_images]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((i) => bildUrl(i.storage_path)),
    variants: [...r.product_variants]
      .sort((a, b) => a.pack_size - b.pack_size)
      .map((v) => ({
        id: v.id,
        packSize: v.pack_size as PackSize,
        priceOre: v.price_ore,
        stock: v.stock,
      })),
  };
}

export function useProducts() {
  const [products, setProducts] = useState<Product[]>(harSupabase ? [] : demoProducts);
  const [loading, setLoading] = useState(harSupabase);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;
    let avbruten = false;
    supabase
      .from("products")
      .select(
        "id, slug, model, description, grade, is_demo, brands(name), product_variants(id, pack_size, price_ore, stock), product_images(storage_path, sort_order)",
      )
      .eq("active", true)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (avbruten) return;
        if (error) setError("Vi kunde inte hämta produkterna. Försök igen om en stund.");
        else setProducts((data as unknown as Rad[]).map(tillProdukt));
        setLoading(false);
      });
    return () => {
      avbruten = true;
    };
  }, []);

  return { products, loading, error };
}
