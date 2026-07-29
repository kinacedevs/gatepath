import React from "react";
import { Lock, Calendar, Video, ArrowRight } from "lucide-react";

interface ChooseYourPathProps {
  plotNumber: number;
  phaseName: string;
  cashPrice: number;
  onSelectOption: (option: "reserve" | "visit" | "virtual") => void;
}

export function ChooseYourPath({ plotNumber, phaseName, cashPrice, onSelectOption }: ChooseYourPathProps) {
  const reservationFee = 15000;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 py-6">
      <div className="text-center space-y-2">
        <span className="px-3 py-1 bg-accent/15 text-accent text-xs font-bold rounded-full uppercase tracking-wider">
          STEP 2 OF 3 — CHOOSE YOUR PATH
        </span>
        <h2 className="font-headline-lg text-3xl text-primary-deep font-bold">
          How Would You Like to Proceed for Plot #{plotNumber}?
        </h2>
        <p className="text-sm text-slate-500 max-w-lg mx-auto">
          {phaseName} • Cash Price: <span className="font-bold text-primary">Ksh {cashPrice.toLocaleString()}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Reserve Now (RECOMMENDED) */}
        <div
          onClick={() => onSelectOption("reserve")}
          className="relative bg-stone border-2 border-primary rounded-2xl p-6 shadow-md hover:shadow-xl hover:-translate-y-1.5 transition-all cursor-pointer flex flex-col justify-between space-y-6"
        >
          <span className="absolute -top-3 right-4 bg-accent text-white text-[10px] font-bold px-3 py-0.5 rounded-full uppercase tracking-wider">
            RECOMMENDED
          </span>

          <div className="space-y-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Lock size={24} />
            </div>
            <div>
              <h3 className="font-headline-md text-xl text-primary-deep font-bold">Reserve This Plot Now</h3>
              <p className="text-xs text-slate-600 mt-1">
                Pay a small deposit to immediately lock Plot #{plotNumber} for 7 days.
              </p>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-slate-200">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase">Reservation Fee</span>
              <p className="font-stat-lg text-2xl font-extrabold text-primary">Ksh {reservationFee.toLocaleString()}</p>
              <p className="text-[10px] text-accent font-semibold mt-0.5">Deducted from final deposit</p>
            </div>
            <button className="w-full py-3 bg-primary text-white font-label-md text-xs font-bold rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
              Reserve Online Now <ArrowRight size={16} />
            </button>
          </div>
        </div>

        {/* Card 2: Book Physical Visit */}
        <div
          onClick={() => onSelectOption("visit")}
          className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all cursor-pointer flex flex-col justify-between space-y-6"
        >
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center text-green-700">
              <Calendar size={24} />
            </div>
            <div>
              <h3 className="font-headline-md text-xl text-slate-800 font-bold">Book Site Visit</h3>
              <p className="text-xs text-slate-500 mt-1">
                Schedule a free guided on-site visit with transport provided by Gatepath.
              </p>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-slate-100">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase">Site Visit Cost</span>
              <p className="font-stat-lg text-2xl font-extrabold text-green-600">FREE</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Transport included</p>
            </div>
            <button className="w-full py-3 border border-primary-deep text-primary-deep font-label-md text-xs font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors">
              Schedule Free Visit <ArrowRight size={16} />
            </button>
          </div>
        </div>

        {/* Card 3: Request Virtual Tour */}
        <div
          onClick={() => onSelectOption("virtual")}
          className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all cursor-pointer flex flex-col justify-between space-y-6"
        >
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center text-purple-700">
              <Video size={24} />
            </div>
            <div>
              <h3 className="font-headline-md text-xl text-slate-800 font-bold">Request Virtual Tour</h3>
              <p className="text-xs text-slate-500 mt-1">
                Perfect for diaspora buyers. Receive a personalized video tour within 24-48 hours.
              </p>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-slate-100">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase">Virtual Video Tour</span>
              <p className="font-stat-lg text-2xl font-extrabold text-purple-700">100% REMOTE</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Dedicated diaspora agent</p>
            </div>
            <button className="w-full py-3 border border-purple-700 text-purple-700 font-label-md text-xs font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-purple-50 transition-colors">
              Request Video Tour <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
