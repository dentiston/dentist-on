import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import instruments from "@/assets/p-instruments.jpg";
import composite from "@/assets/p-composite.jpg";
import handpiece from "@/assets/p-handpiece.jpg";

export type Product = {
  id: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  bulk_price: number;
  image: string;
  description: string;
  active: boolean;
  stock?: number | null;
};

export const categories = ["الكل", "أدوات يدوية", "مواد ترميمية", "قبضات وأجهزة", "تعقيم ووقاية"];
const builtIn: Record<string, string> = { instruments, composite, handpiece };
export const imgSrc = (img: string) => builtIn[img] ?? img;

export const productsQuery = {
  queryKey: ["products"],
  queryFn: async () => {
    const { data, error } = await supabase.from("products").select("*").order("created_at");
    if (error) throw error;
    return data as Product[];
  },
};
export const useProducts = () => useQuery(productsQuery);

export const unitPrice = (p: Product, qty: number) => Number(qty >= 10 ? p.bulk_price : p.price);
export const soldOut = (p: Product) => p.stock != null && p.stock <= 0;
export const fmt = (n: number) => `$${Number(n).toFixed(2)}`;
