import React, { useState, useMemo } from "react";

interface LoanCalculatorProps {
  cashPrice: number;
  onDepositChange?: (depositAmount: number, monthlyPayment: number, termMonths: number) => void;
}

export function LoanCalculator({ cashPrice, onDepositChange }: LoanCalculatorProps) {
  const [depositPercent, setDepositPercent] = useState<number>(30); // Default 30%
  const [repaymentMonths, setRepaymentMonths] = useState<number>(12); // Default 12 Months

  const depositAmount = useMemo(() => Math.round((cashPrice * depositPercent) / 100), [cashPrice, depositPercent]);
  const remainingBalance = useMemo(() => Math.max(0, cashPrice - depositAmount), [cashPrice, depositAmount]);
  const monthlyPayment = useMemo(() => (repaymentMonths > 0 ? Math.round(remainingBalance / repaymentMonths) : 0), [remainingBalance, repaymentMonths]);

  const handlePercentChange = (newPercent: number) => {
    setDepositPercent(newPercent);
    const newDeposit = Math.round((cashPrice * newPercent) / 100);
    const newBalance = Math.max(0, cashPrice - newDeposit);
    const newMonthly = repaymentMonths > 0 ? Math.round(newBalance / repaymentMonths) : 0;
    if (onDepositChange) {
      onDepositChange(newDeposit, newMonthly, repaymentMonths);
    }
  };

  const handleMonthsChange = (newMonths: number) => {
    setRepaymentMonths(newMonths);
    const newMonthly = newMonths > 0 ? Math.round(remainingBalance / newMonths) : 0;
    if (onDepositChange) {
      onDepositChange(depositAmount, newMonthly, newMonths);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-accent">In-House Financial Calculator</span>
          <h3 className="font-headline-md text-xl text-primary-deep font-bold">Flexible 0% Interest Payment Plan</h3>
        </div>
        <span className="px-3 py-1 bg-green-100 text-green-800 text-[10px] font-bold rounded-full uppercase tracking-wider">
          0% Interest Guaranteed
        </span>
      </div>

      {/* Plot Base Price */}
      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
        <span className="text-xs font-semibold text-slate-600">Total Plot Cash Price</span>
        <span className="font-stat-lg text-2xl font-extrabold text-primary">
          Ksh {cashPrice.toLocaleString()}
        </span>
      </div>

      {/* Deposit Slider */}
      <div className="space-y-2">
        <div className="flex justify-between items-center text-xs">
          <label className="font-bold text-slate-700">Initial Down Payment ({depositPercent}%)</label>
          <span className="font-stat-lg font-bold text-accent">Ksh {depositAmount.toLocaleString()}</span>
        </div>
        <input
          type="range"
          min={10}
          max={100}
          step={5}
          value={depositPercent}
          onChange={(e) => handlePercentChange(Number(e.target.value))}
          className="w-full accent-accent h-2 bg-slate-200 rounded-lg cursor-pointer"
        />
        <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
          <span>Min 10% (Ksh {Math.round(cashPrice * 0.1).toLocaleString()})</span>
          <span>100% Full Payment</span>
        </div>
      </div>

      {/* Repayment Term Selector */}
      <div className="space-y-2">
        <label className="block text-xs font-bold text-slate-700">Select Repayment Duration</label>
        <div className="grid grid-cols-5 gap-2">
          {[6, 12, 18, 24, 36].map((months) => (
            <button
              key={months}
              type="button"
              onClick={() => handleMonthsChange(months)}
              className={`py-2.5 rounded-xl font-label-md text-xs font-bold transition-all ${
                repaymentMonths === months
                  ? "bg-primary-deep text-white shadow-md"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {months} Mos
            </button>
          ))}
        </div>
      </div>

      {/* Live Calculation Output Bento */}
      <div className="grid grid-cols-2 gap-3 p-4 bg-stone rounded-xl border border-slate-200">
        <div className="p-3 bg-white rounded-lg">
          <span className="text-[10px] font-bold text-slate-400 uppercase block">Monthly Payment</span>
          <span className="font-stat-lg text-lg font-extrabold text-primary">
            Ksh {monthlyPayment.toLocaleString()}/mo
          </span>
        </div>
        <div className="p-3 bg-white rounded-lg">
          <span className="text-[10px] font-bold text-slate-400 uppercase block">Remaining Balance</span>
          <span className="font-stat-lg text-lg font-extrabold text-slate-800">
            Ksh {remainingBalance.toLocaleString()}
          </span>
        </div>
      </div>

      <p className="text-[11px] text-slate-400 italic text-center">
        * No hidden bank interest or administrative penalties. Gatepath in-house plans are direct and transparent.
      </p>
    </div>
  );
}
