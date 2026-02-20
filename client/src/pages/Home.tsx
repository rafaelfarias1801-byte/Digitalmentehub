import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import BrandsServed from "@/components/BrandsServed";
import Laboratory from "@/components/Laboratory";
import Services from "@/components/Services";
import HowItWorks from "@/components/HowItWorks";
import Partners from "@/components/Partners";
import FAQ from "@/components/FAQ";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import WhatsAppFloat from "@/components/WhatsAppFloat";

export default function Home() {
  return (
    <div className="bg-brand-navy min-h-screen">
      <Navbar />
      <Hero />
      <BrandsServed />
      <Laboratory />
      <Services />
      <HowItWorks />
      <Partners />
      <FAQ />
      <Contact />
      <Footer />
      <WhatsAppFloat />
    </div>
  );
}
