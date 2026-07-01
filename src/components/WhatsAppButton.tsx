export function WhatsAppButton() {
  return (
    <a
      href="https://wa.me/254799488488?text=Hello%20Gatepath%20Realtors%2C%20I%20am%20interested%20in%20a%20land%20plot."
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      className="group fixed bottom-7 right-7 z-50 flex items-center"
    >
      <span className="hidden group-hover:inline-block mr-3 bg-primary text-white text-[13px] font-medium px-3 py-1.5 rounded">
        Chat With Us
      </span>
      <span className="h-[60px] w-[60px] rounded-full bg-[#25D366] text-white shadow-[0_6px_20px_rgba(37,211,102,0.35)] hover:shadow-[0_8px_24px_rgba(37,211,102,0.45)] flex items-center justify-center hover:scale-110 transition-all duration-300">
        <svg viewBox="0 0 32 32" className="h-7 w-7" fill="currentColor" aria-hidden="true">
          <path d="M19.11 17.27c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51l-.57-.01c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.49 0 1.47 1.07 2.89 1.22 3.09.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.08 1.77-.72 2.02-1.42.25-.7.25-1.29.17-1.42-.07-.13-.27-.2-.57-.35z"/>
          <path d="M26.58 5.42A13.95 13.95 0 0 0 16 1C8.27 1 1.99 7.27 1.99 15c0 2.46.64 4.86 1.86 6.98L2 31l9.27-2.43A14.02 14.02 0 0 0 16 29c7.73 0 14.01-6.27 14.01-14 0-3.74-1.46-7.26-3.43-9.58zM16 26.61c-2.07 0-4.1-.56-5.87-1.61l-.42-.25-5.5 1.44 1.47-5.36-.27-.43A11.55 11.55 0 0 1 4.4 15c0-6.4 5.2-11.6 11.6-11.6 3.1 0 6.01 1.21 8.2 3.4a11.5 11.5 0 0 1 3.4 8.2c0 6.4-5.2 11.61-11.6 11.61z"/>
        </svg>
      </span>
    </a>
  );
}
