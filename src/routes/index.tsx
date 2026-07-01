import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/sections/Navbar";
import { Hero } from "@/components/sections/Hero";
import { TrustBar } from "@/components/sections/TrustBar";
import { LocationsMarquee } from "@/components/sections/LocationsMarquee";
import { FeaturedLocations } from "@/components/sections/FeaturedLocations";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { WhyGatepath } from "@/components/sections/WhyGatepath";
import { PropertyPreview } from "@/components/sections/PropertyPreview";
import { Testimonials } from "@/components/sections/Testimonials";
import { CeoSection } from "@/components/sections/CeoSection";
import { CTABanner } from "@/components/sections/CTABanner";
import { Footer } from "@/components/sections/Footer";
import { WhatsAppButton } from "@/components/WhatsAppButton";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Gatepath Realtors — Premium Land for Sale in Kenya" },
      {
        name: "description",
        content:
          "Verified land plots in Malindi, Sagana, Diani, Nanyuki, Thika and 7 more Kenyan locations. Transparent pricing, verified title deeds, flexible payment plans.",
      },
      { property: "og:title", content: "Gatepath Realtors — Premium Land for Sale in Kenya" },
      { property: "og:description", content: "Own your piece of Kenya's future. Verified title deeds, transparent pricing." },
      { property: "og:url", content: "/" },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
});

function Index() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main>
        <Hero />
        <TrustBar />
        <LocationsMarquee />
        <FeaturedLocations />
        <HowItWorks />
        <WhyGatepath />
        <PropertyPreview />
        <Testimonials />
        <CeoSection />
        <CTABanner />
      </main>
      <Footer />
      <WhatsAppButton />
    </div>
  );
}
