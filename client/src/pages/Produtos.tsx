import Navbar from "@/components/Navbar";
import Packs from "@/components/Packs";
import Footer from "@/components/Footer";
import WhatsAppFloat from "@/components/WhatsAppFloat";

export default function Produtos() {
  return (
    <div className="bg-brand-navy min-h-screen">
      <Navbar />
      <div className="pt-20">
        <Packs />
      </div>
      <Footer />
      <WhatsAppFloat />
    </div>
  );
}
