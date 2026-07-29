import React, { useState, useEffect } from "react";
import { Shield, Cookie, X } from "lucide-react";

export function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("gatepath_cookie_consent");
    if (!consent) {
      setIsVisible(true);
    }
  }, []);

  const handleAcceptAll = () => {
    localStorage.setItem("gatepath_cookie_consent", JSON.stringify({ essential: true, analytics: true, marketing: true }));
    setIsVisible(false);
  };

  const handleEssentialOnly = () => {
    localStorage.setItem("gatepath_cookie_consent", JSON.stringify({ essential: true, analytics: false, marketing: false }));
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <>
      {/* Floating Bottom Glassmorphism Banner */}
      <div className="fixed bottom-4 left-4 right-4 md:left-8 md:right-auto md:max-w-xl z-50 bg-[#074B7D]/95 backdrop-blur-md text-white border border-[#E8A020]/30 rounded-2xl p-5 shadow-2xl animate-in slide-in-from-bottom-5 duration-300">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#E8A020]/20 flex items-center justify-center text-[#E8A020] shrink-0">
            <Cookie size={20} />
          </div>
          <div className="space-y-3 flex-1">
            <div>
              <h4 className="font-headline-md text-sm font-bold text-white">Data Protection & Cookie Preferences</h4>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                We use cookies to secure your land inquiries, provide real-time masterplan status updates, and comply with the <strong className="text-white">Kenyan Data Protection Act (2019)</strong>.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                onClick={handleAcceptAll}
                className="px-4 py-2 bg-[#E8A020] text-white font-label-md text-xs font-bold rounded-lg hover:opacity-90 transition-opacity"
              >
                Accept All
              </button>
              <button
                onClick={handleEssentialOnly}
                className="px-4 py-2 bg-white/10 text-white font-label-md text-xs font-semibold rounded-lg hover:bg-white/20 transition-colors"
              >
                Essential Only
              </button>
              <button
                onClick={() => setShowPreferences(true)}
                className="px-3 py-2 text-xs text-[#E8A020] hover:underline"
              >
                Customize
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Preferences Modal */}
      {showPreferences && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full space-y-5 relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowPreferences(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3">
              <Shield className="text-[#0B7FC7]" size={24} />
              <h3 className="font-headline-md text-lg text-[#074B7D] font-bold">Cookie Security Settings</h3>
            </div>

            <div className="space-y-4 text-xs text-slate-600">
              <div className="p-3 bg-slate-50 rounded-xl flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800 block">Strictly Necessary Cookies</span>
                  <span>Required for secure logins, plot reservation locks, and Paystack transactions.</span>
                </div>
                <input type="checkbox" checked disabled className="accent-[#0B7FC7]" />
              </div>

              <div className="p-3 bg-slate-50 rounded-xl flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800 block">Performance & Analytics</span>
                  <span>Allows us to optimize masterplan map loading speeds and search filters.</span>
                </div>
                <input type="checkbox" defaultChecked className="accent-[#0B7FC7]" />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-3">
              <button
                onClick={handleAcceptAll}
                className="px-5 py-2.5 bg-[#074B7D] text-white text-xs font-bold rounded-xl hover:opacity-90"
              >
                Save Preferences
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
