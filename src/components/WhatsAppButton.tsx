import { useContactInfo } from "@/hooks/useContactInfo";
import { WhatsAppIcon } from "@/components/WhatsAppIcon";

export function WhatsAppButton() {
  const { whatsappNumber } = useContactInfo();

  return (
    <a
      href={`https://wa.me/${whatsappNumber}?text=Hello%20Gatepath%20Realtors%2C%20I%20am%20interested%20in%20a%20land%20plot.`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      className="group fixed bottom-7 right-7 z-50 flex items-center"
    >
      <span className="hidden group-hover:inline-block mr-3 bg-primary text-white text-[13px] font-medium px-3 py-1.5 rounded">
        Chat With Us
      </span>
      <span className="h-[60px] w-[60px] rounded-full bg-[#25D366] text-white shadow-[0_6px_20px_rgba(37,211,102,0.35)] hover:shadow-[0_8px_24px_rgba(37,211,102,0.45)] flex items-center justify-center hover:scale-110 transition-all duration-300">
        <WhatsAppIcon size={28} />
      </span>
    </a>
  );
}
