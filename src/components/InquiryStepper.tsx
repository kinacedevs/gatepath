import { Check } from "lucide-react";

interface StepperProps {
  currentStep: 1 | 2 | 3;
}

const STEPS = [
  { num: 1, label: "Your Inquiry", short: "Inquiry" },
  { num: 2, label: "Book Site Visit", short: "Visit" },
  { num: 3, label: "Secure Your Plot", short: "Secure" },
] as const;

export function InquiryStepper({ currentStep }: StepperProps) {
  return (
    <div
      className="sticky top-20 z-20 bg-white border-b"
      style={{ borderColor: "#E5E0D8" }}
    >
      <div className="mx-auto max-w-5xl px-4 md:px-12 py-5 md:py-6">
        <div className="flex items-center justify-between">
          {STEPS.map((step, i) => {
            const done = step.num < currentStep;
            const active = step.num === currentStep;
            const isLast = i === STEPS.length - 1;
            return (
              <div key={step.num} className="flex items-center flex-1 last:flex-none">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="flex items-center justify-center rounded-full shrink-0 transition-all"
                    style={{
                      width: 40,
                      height: 40,
                      background: done
                        ? "#22C55E"
                        : active
                          ? "#0B7FC7"
                          : "#FFFFFF",
                      border: done || active ? "none" : "1.5px solid #D0CCC5",
                      color: "#FFFFFF",
                    }}
                  >
                    {done ? (
                      <Check size={20} strokeWidth={3} />
                    ) : (
                      <span
                        style={{
                          fontFamily: "Montserrat, sans-serif",
                          fontWeight: 700,
                          fontSize: 16,
                          color: active ? "#FFFFFF" : "#9A9A9A",
                        }}
                      >
                        {step.num}
                      </span>
                    )}
                  </div>
                  <div
                    className={`${active ? "block" : "hidden md:block"} truncate`}
                    style={{
                      fontFamily: "Inter, sans-serif",
                      fontWeight: active ? 600 : 400,
                      fontSize: active ? 14 : 13,
                      color: active ? "#0B7FC7" : done ? "#5A5A5A" : "#9A9A9A",
                    }}
                  >
                    <span className="hidden sm:inline">{step.label}</span>
                    <span className="sm:hidden">{step.short}</span>
                  </div>
                </div>
                {!isLast && (
                  <div
                    className="flex-1 h-[2px] mx-3 md:mx-5 rounded"
                    style={{
                      background: done ? "#22C55E" : "#E5E0D8",
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
