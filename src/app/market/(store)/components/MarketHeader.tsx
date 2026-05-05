"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, Rocket, ShoppingCart, ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useCart } from "@/components/cart/CartProvider";

const NOVA_BLUE = "#071A3A";
const NOVA_AQUA = "#2FF0D6";

export default function MarketHeader() {
  const router = useRouter();
  const { count } = useCart();

  const [open, setOpen] = useState(false);
  const [openCategories, setOpenCategories] = useState(false);
  const [openBrands, setOpenBrands] = useState(false);

  const [categories, setCategories] = useState<any[]>([]);
  const [subcategories, setSubcategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const { data: cats } = await supabase
      .from("market_categories")
      .select("id,name")
      .eq("active", true);

    const { data: subs } = await supabase
      .from("market_subcategories")
      .select("id,name,category_name")
      .eq("active", true);

    const { data: brandsData } = await supabase
      .from("product_brands")
      .select("id,name")
      .eq("active", true);

    setCategories(cats || []);
    setSubcategories(subs || []);
    setBrands(brandsData || []);
  }

  function go(url: string) {
    setOpen(false);
    router.push(url);
  }

  function getSubs(cat: string) {
    return subcategories.filter(
      (s) => s.category_name?.toLowerCase() === cat.toLowerCase()
    );
  }

  return (
    <header
      className="w-full border-b relative"
      style={{
        backgroundColor: NOVA_BLUE,
        borderColor: "rgba(255,255,255,0.08)",
      }}
    >
      <div className="max-w-6xl mx-auto px-4 py-4 grid grid-cols-12 items-center gap-4">
        {/* LOGO */}
        <div className="col-span-6 md:col-span-3">
          <Link
            href="/market"
            className="text-2xl font-black"
            style={{ color: NOVA_AQUA }}
          >
            NOVA
          </Link>
        </div>

        {/* BOTÓN COMPRAR */}
        <div className="col-span-6 md:col-span-6 flex items-center gap-3">
          <button
            onClick={() => setOpen(!open)}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold"
            style={{
              backgroundColor: NOVA_AQUA,
              color: NOVA_BLUE,
            }}
          >
            Comprar
            <ChevronDown size={16} />
          </button>

          {/* DROPDOWN */}
          {open && (
            <div className="absolute top-20 left-4 md:left-[20%] w-[320px] bg-white text-black rounded-xl shadow-xl p-4 z-50 space-y-3">
              {/* TODOS */}
              <div
                className="font-semibold cursor-pointer hover:text-emerald-600"
                onClick={() => go("/market")}
              >
                Ver todos los productos
              </div>

              {/* CATEGORÍAS */}
              <div>
                <div
                  className="flex justify-between items-center cursor-pointer font-semibold"
                  onClick={() => setOpenCategories(!openCategories)}
                >
                  Categorías <ChevronDown size={14} />
                </div>

                {openCategories && (
                  <div className="ml-2 mt-2 space-y-2 max-h-60 overflow-auto">
                    {categories.map((c) => (
                      <div key={c.id}>
                        <div
                          className="cursor-pointer text-sm hover:text-emerald-600"
                          onClick={() =>
                            go(`/market?category=${encodeURIComponent(c.name)}`)
                          }
                        >
                          {c.name}
                        </div>

                        {/* SUBCATEGORÍAS */}
                        <div className="ml-3 mt-1 space-y-1">
                          {getSubs(c.name).map((s) => (
                            <div
                              key={s.id}
                              className="text-xs cursor-pointer text-gray-600 hover:text-emerald-600"
                              onClick={() =>
                                go(
                                  `/market?category=${encodeURIComponent(
                                    c.name
                                  )}&subcategory=${encodeURIComponent(s.name)}`
                                )
                              }
                            >
                              - {s.name}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* MARCAS */}
              <div>
                <div
                  className="flex justify-between items-center cursor-pointer font-semibold"
                  onClick={() => setOpenBrands(!openBrands)}
                >
                  Marcas <ChevronDown size={14} />
                </div>

                {openBrands && (
                  <div className="ml-2 mt-2 space-y-2 max-h-60 overflow-auto">
                    {brands.map((b) => (
                      <div
                        key={b.id}
                        className="cursor-pointer text-sm hover:text-emerald-600"
                        onClick={() =>
                          go(`/market?brand=${encodeURIComponent(b.id)}`)
                        }
                      >
                        {b.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* DERECHA */}
        <div className="col-span-12 md:col-span-3 flex justify-end items-center gap-4">
          <button
            onClick={() => router.push("/market/cart")}
            className="relative"
          >
            <ShoppingCart color={NOVA_AQUA} />
            {count > 0 && (
              <span className="absolute -top-2 -right-2 bg-emerald-400 text-black text-xs px-1 rounded-full">
                {count}
              </span>
            )}
          </button>

          <Link href="/login" style={{ color: NOVA_AQUA }}>
            Login
          </Link>
        </div>
      </div>
    </header>
  );
}