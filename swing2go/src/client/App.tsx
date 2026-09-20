import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { sv } from "@/i18n/sv";
import Hem from "@/pages/Hem";

// Sidor utom startsidan laddas först när de behövs.
const Shop = lazy(() => import("@/pages/Shop"));
const Produkt = lazy(() => import("@/pages/Produkt"));
const Varukorg = lazy(() => import("@/pages/Varukorg"));
const Checkout = lazy(() => import("@/pages/Checkout"));
const MittKonto = lazy(() => import("@/pages/MittKonto"));
const OmOss = lazy(() => import("@/pages/OmOss"));
const HurDetFungerar = lazy(() => import("@/pages/HurDetFungerar"));
const Faq = lazy(() => import("@/pages/Faq"));
const Kontakt = lazy(() => import("@/pages/Kontakt"));
const AdminLayout = lazy(() => import("@/pages/admin/AdminLayout"));

export default function App() {
  return (
    <Suspense fallback={<p className="wrap py-20 text-skiffer">{sv.vanlig.laddar}</p>}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Hem />} />
          <Route path="shop" element={<Shop />} />
          <Route path="produkt/:slug" element={<Produkt />} />
          <Route path="varukorg" element={<Varukorg />} />
          <Route path="kassa" element={<Checkout />} />
          <Route path="mitt-konto" element={<MittKonto />} />
          <Route path="om-oss" element={<OmOss />} />
          <Route path="hur-det-fungerar" element={<HurDetFungerar />} />
          <Route path="faq" element={<Faq />} />
          <Route path="kontakt" element={<Kontakt />} />
          <Route path="admin/*" element={<AdminLayout />} />
          <Route path="*" element={<Hem />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
