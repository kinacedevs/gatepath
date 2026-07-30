import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { InquiryStepper } from "@/components/InquiryStepper";
import { PlotSummaryCard } from "@/components/inquiry/PlotSummaryCard";
import { useInquiry } from "@/context/InquiryContext";
import { verifyPaymentFn } from "@/lib/paymentActions";

const PAYSTACK_KEY = (import.meta.env?.VITE_PAYSTACK_PUBLIC_KEY ||
  "pk_test_b0065a39ea3c50c3b60c0ab7a84832b0ea31080a") as string;

export const Route = createFileRoute("/payment")({
  component: PaymentPage,
  head: () => ({
    meta: [
      { title: "Secure Your Plot — Gatepath Realtors" },
      { name: "description", content: "Plan your payments and secure your plot with a deposit." },
    ],
    scripts: [{ src: "https://js.paystack.co/v1/inline.js" }],
  }),
});

const PERIODS = [0, 3, 6, 12];
const METHODS = [
  { id: "mpesa", icon: "📱", label: "M-Pesa" },
  { id: "card", icon: "💳", label: "Card" },
  { id: "bank", icon: "🏦", label: "Bank Transfer" },
];

function PaymentPage() {
  const { form, setForm } = useInquiry();
  const navigate = useNavigate();
  const totalPrice = form.plotPrice;
  const minDeposit = form.reservePlot ? 10000 : Math.round(totalPrice * 0.1);
  const defaultDeposit = form.reservePlot ? 10000 : Math.round(totalPrice * 0.3);

  const [deposit, setDeposit] = useState(form.depositAmount || defaultDeposit || 0);
  const [period, setPeriod] = useState(form.loanPeriod || 12);
  const [method, setMethod] = useState(form.paymentMethod || "mpesa");
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  useEffect(() => {
    // If fullName is missing, go back to inquire. If not reserving and no visit date, go back to book-visit.
    if (!form.fullName) navigate({ to: "/inquire" });
    else if (!form.reservePlot && !form.visitDate) navigate({ to: "/book-visit" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (totalPrice && !deposit) setDeposit(defaultDeposit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalPrice]);

  const { adjustedPrice, balance, monthly, totalPayable, pct } = useMemo(() => {
    let surcharge = 0;
    let discount = 0;

    if (period === 0 || deposit >= totalPrice) {
      discount = totalPrice * 0.05;
    } else if (period === 3) {
      surcharge = 30000;
    } else if (period === 6) {
      surcharge = 50000;
    } else if (period === 12) {
      surcharge = 100000;
    }

    const adj = totalPrice + surcharge - discount;
    const bal = Math.max(0, adj - deposit);
    const m = period > 0 && bal > 0 ? Math.ceil(bal / period) : 0;

    return {
      adjustedPrice: adj,
      balance: bal,
      monthly: m,
      totalPayable: adj,
      pct: totalPrice ? Math.round((deposit / totalPrice) * 100) : 0,
    };
  }, [deposit, period, totalPrice]);

  const isFullPayment = deposit >= adjustedPrice;

  const handlePay = () => {
    setForm({ depositAmount: deposit, loanPeriod: period, paymentMethod: method });
    if (typeof PaystackPop === "undefined") {
      alert("Payment system loading. Please try again in a moment.");
      return;
    }
    if (!form.inquiryId) {
      setVerifyError("Your inquiry session expired — please start again from the properties page.");
      return;
    }
    setVerifyError(null);

    // Map our method selection to Paystack channel slugs
    const channels =
      method === "mpesa" ? ["mobile_money"] : method === "card" ? ["card"] : ["bank", "card"];

    const handler = PaystackPop.setup({
      key: PAYSTACK_KEY,
      email: form.email,
      amount: deposit * 100,
      currency: "KES",
      ref: `GR-${form.plotNumber}-${Date.now()}`,
      channels,
      metadata: {
        custom_fields: [
          { display_name: "Buyer Name", variable_name: "buyer_name", value: form.fullName },
          { display_name: "Plot Number", variable_name: "plot_number", value: form.plotNumber },
          { display_name: "Phase", variable_name: "phase", value: form.phaseName },
          { display_name: "Phone", variable_name: "phone", value: form.phone },
        ],
      },
      // Paystack's own "success" callback only tells us the popup finished —
      // it is not proof money moved. Everything downstream (payments,
      // agreements, plot status) now waits on the server re-verifying this
      // reference directly against Paystack's API before writing anything.
      // See CRITIQUE.md P0-2 and lib/paymentActions.ts.
      callback: (response) => {
        setVerifying(true);
        (verifyPaymentFn as any)({
          data: { reference: response.reference, inquiryId: form.inquiryId },
        })
          .then((result: any) => {
            setVerifying(false);
            if (!result?.success) {
              setVerifyError(
                result?.error ||
                  "We couldn't confirm your payment. If money left your account, contact us on WhatsApp with your reference: " +
                    response.reference,
              );
              return;
            }
            navigate({
              to: "/thank-you",
              search: { inquiryId: form.inquiryId },
            });
          })
          .catch((err: any) => {
            setVerifying(false);
            setVerifyError(
              "We couldn't confirm your payment. If money left your account, contact us on WhatsApp with your reference: " +
                response.reference,
            );
            console.error("[Payment] verify call failed:", err);
          });
      },
      onClose: () => {
        // user cancelled
      },
    });
    handler.openIframe();
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--ivory)" }}>
      <Navbar />
      <div className="pt-20">
        <InquiryStepper currentStep={3} />

        <div style={{ background: "var(--primary)", padding: "32px 24px" }}>
          <div className="mx-auto max-w-7xl grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-center">
            <div>
              <div
                style={{
                  fontFamily: "Montserrat, sans-serif",
                  fontWeight: 500,
                  fontSize: 11,
                  color: "var(--accent)",
                  letterSpacing: "0.25em",
                }}
              >
                STEP 3 OF 3
              </div>
              <h1
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontWeight: 600,
                  fontSize: "clamp(28px, 5vw, 40px)",
                  color: "#FFFFFF",
                  marginTop: 8,
                  lineHeight: 1.15,
                }}
              >
                Secure Your Plot Today
              </h1>
              <p
                style={{
                  fontFamily: "Inter, sans-serif",
                  fontWeight: 300,
                  fontSize: 16,
                  color: "rgba(255,255,255,0.75)",
                  marginTop: 10,
                }}
              >
                Use the calculator below to plan your payments. Then pay your deposit to lock in
                your plot.
              </p>
            </div>
            <PlotSummaryCard />
          </div>
        </div>

        <div className="mx-auto" style={{ maxWidth: 1100, padding: "40px 24px" }}>
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">
            <div
              style={{
                background: "#FFFFFF",
                borderRadius: 12,
                padding: "36px 28px",
                boxShadow: "0 4px 24px rgba(11,127,199,0.08)",
                border: "1px solid #E5E0D8",
              }}
            >
              <div
                style={{
                  fontFamily: "Montserrat, sans-serif",
                  fontWeight: 600,
                  fontSize: 11,
                  color: "var(--accent)",
                  letterSpacing: "0.2em",
                }}
              >
                {form.reservePlot ? "RESERVATION DEPOSIT HOLD" : "PAYMENT CALCULATOR"}
              </div>
              <p
                style={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: 14,
                  color: "var(--muted-foreground)",
                  marginTop: 6,
                }}
              >
                {form.reservePlot
                  ? "Select the amount you want to pay to hold this plot. The minimum required fee is Ksh 10,000. This secures your plot for 14 days."
                  : "Plan your payments before committing. Adjust the sliders to see monthly costs."}
              </p>

              {/* Plot price */}
              <div className="mt-6">
                <div
                  style={{
                    fontFamily: "Inter, sans-serif",
                    fontSize: 13,
                    fontWeight: 500,
                    color: "var(--foreground)",
                    marginBottom: 6,
                  }}
                >
                  Plot Price
                </div>
                <div
                  style={{
                    background: "var(--ivory)",
                    border: "1px solid #E5E0D8",
                    borderRadius: 8,
                    padding: "14px 16px",
                    fontFamily: "Montserrat, sans-serif",
                    fontWeight: 700,
                    fontSize: 20,
                    color: "var(--primary)",
                  }}
                >
                  Ksh {totalPrice.toLocaleString()}
                </div>
                <div
                  style={{
                    fontFamily: "Inter, sans-serif",
                    fontSize: 12,
                    color: "var(--muted-foreground)",
                    marginTop: 4,
                  }}
                >
                  This is the listed price for Plot #{form.plotNumber}
                </div>
              </div>

              {/* Deposit */}
              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <div
                    style={{
                      fontFamily: "Inter, sans-serif",
                      fontSize: 13,
                      fontWeight: 500,
                      color: "var(--foreground)",
                    }}
                  >
                    {form.reservePlot
                      ? "Your Reservation Payment Amount *"
                      : "Your Deposit Amount *"}
                  </div>
                  <span
                    style={{
                      background: "var(--accent)",
                      color: "#FFFFFF",
                      fontFamily: "Inter, sans-serif",
                      fontWeight: 600,
                      fontSize: 12,
                      padding: "4px 12px",
                      borderRadius: 999,
                    }}
                  >
                    {form.reservePlot ? "Reservation Hold Fee" : `${pct}% deposit`}
                  </span>
                </div>
                <input
                  type="range"
                  min={minDeposit}
                  max={totalPrice}
                  step={5000}
                  value={deposit}
                  onChange={(e) => setDeposit(Number(e.target.value))}
                  style={{ width: "100%", accentColor: "var(--primary)" }}
                />
                <div
                  className="flex justify-between mt-1"
                  style={{
                    fontFamily: "Inter, sans-serif",
                    fontSize: 11,
                    color: "var(--muted-foreground)",
                  }}
                >
                  <span>
                    {form.reservePlot
                      ? `Min: Ksh 10,000`
                      : `Min: 10% (Ksh ${minDeposit.toLocaleString()})`}
                  </span>
                  <span>Full payment (Ksh {totalPrice.toLocaleString()})</span>
                </div>
                <input
                  type="number"
                  value={deposit}
                  min={minDeposit}
                  max={totalPrice}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    if (!isNaN(n)) setDeposit(Math.max(minDeposit, Math.min(totalPrice, n)));
                  }}
                  className="mt-3"
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    border: "1.5px solid #E5E0D8",
                    borderRadius: 8,
                    fontFamily: "Montserrat, sans-serif",
                    fontWeight: 600,
                    fontSize: 16,
                    color: "var(--primary)",
                    background: "#FFFFFF",
                  }}
                />
              </div>

              {/* Period */}
              {!isFullPayment && (
                <div className="mt-6">
                  <div
                    style={{
                      fontFamily: "Inter, sans-serif",
                      fontSize: 13,
                      fontWeight: 500,
                      color: "var(--foreground)",
                      marginBottom: 8,
                    }}
                  >
                    Repayment Period (for remaining balance)
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {PERIODS.map((p) => {
                      const sel = period === p;
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setPeriod(p)}
                          style={{
                            border: `1.5px solid ${sel ? "var(--primary)" : "#E5E0D8"}`,
                            background: sel ? "var(--primary)" : "#FFFFFF",
                            color: sel ? "#FFFFFF" : "var(--muted-foreground)",
                            fontFamily: "Inter, sans-serif",
                            fontWeight: sel ? 600 : 500,
                            fontSize: 14,
                            padding: "10px 18px",
                            borderRadius: 999,
                            cursor: "pointer",
                          }}
                        >
                          {p === 0 ? "Cash (30 days)" : `${p} months`}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Interest */}
              <div className="mt-6">
                <div
                  style={{
                    fontFamily: "Inter, sans-serif",
                    fontSize: 13,
                    fontWeight: 500,
                    color: "var(--foreground)",
                    marginBottom: 6,
                  }}
                >
                  Interest Rate & Plan Adjustments
                </div>
                <span
                  style={{
                    background: "#D1FAE5",
                    color: "#065F46",
                    fontFamily: "Inter, sans-serif",
                    fontWeight: 600,
                    fontSize: 13,
                    padding: "6px 14px",
                    borderRadius: 999,
                  }}
                >
                  0% Interest (Adjusted Plan)
                </span>
                <div
                  style={{
                    fontFamily: "Inter, sans-serif",
                    fontSize: 12,
                    color: "var(--muted-foreground)",
                    marginTop: 6,
                  }}
                >
                  0% Interest in-house plan. Cash plan enjoys a 5% discount (paid within 30 days).
                  Instalment surcharges: Ksh 30k (3m), Ksh 50k (6m), Ksh 100k (12m).
                </div>
              </div>

              {/* Results */}
              <div
                className="mt-7"
                style={{
                  background: "var(--stone)",
                  border: "1px solid #E5E0D8",
                  borderRadius: 10,
                  padding: 24,
                }}
              >
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <div
                      style={{
                        fontFamily: "Inter, sans-serif",
                        fontSize: 11,
                        color: "var(--muted-foreground)",
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                      }}
                    >
                      Your Deposit
                    </div>
                    <div
                      style={{
                        fontFamily: "Montserrat, sans-serif",
                        fontWeight: 700,
                        fontSize: 22,
                        color: "var(--primary)",
                        marginTop: 4,
                      }}
                    >
                      Ksh {deposit.toLocaleString()}
                    </div>
                    <div
                      style={{
                        fontFamily: "Inter, sans-serif",
                        fontSize: 12,
                        color: "var(--muted-foreground)",
                      }}
                    >
                      ({pct}% of total)
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontFamily: "Inter, sans-serif",
                        fontSize: 11,
                        color: "var(--muted-foreground)",
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                      }}
                    >
                      Monthly Payment
                    </div>
                    {isFullPayment ? (
                      <div
                        style={{
                          fontFamily: "Montserrat, sans-serif",
                          fontWeight: 700,
                          fontSize: 16,
                          color: "var(--available)",
                          marginTop: 4,
                        }}
                      >
                        Full Payment — No Balance
                      </div>
                    ) : period === 0 ? (
                      <>
                        <div
                          style={{
                            fontFamily: "Montserrat, sans-serif",
                            fontWeight: 700,
                            fontSize: 18,
                            color: "var(--available)",
                            marginTop: 4,
                          }}
                        >
                          Cash Plan
                        </div>
                        <div
                          style={{
                            fontFamily: "Inter, sans-serif",
                            fontSize: 12,
                            color: "var(--muted-foreground)",
                          }}
                        >
                          Cleared within 30 days
                        </div>
                      </>
                    ) : (
                      <>
                        <div
                          style={{
                            fontFamily: "Montserrat, sans-serif",
                            fontWeight: 700,
                            fontSize: 22,
                            color: "var(--primary)",
                            marginTop: 4,
                          }}
                        >
                          Ksh {monthly.toLocaleString()}
                        </div>
                        <div
                          style={{
                            fontFamily: "Inter, sans-serif",
                            fontSize: 12,
                            color: "var(--muted-foreground)",
                          }}
                        >
                          over {period} months
                        </div>
                      </>
                    )}
                  </div>
                  <div>
                    <div
                      style={{
                        fontFamily: "Inter, sans-serif",
                        fontSize: 11,
                        color: "var(--muted-foreground)",
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                      }}
                    >
                      Remaining Balance
                    </div>
                    <div
                      style={{
                        fontFamily: "Montserrat, sans-serif",
                        fontWeight: 700,
                        fontSize: 22,
                        color: "var(--primary)",
                        marginTop: 4,
                      }}
                    >
                      Ksh {Math.max(0, balance).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontFamily: "Inter, sans-serif",
                        fontSize: 11,
                        color: "var(--muted-foreground)",
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                      }}
                    >
                      Total to Pay
                    </div>
                    <div
                      style={{
                        fontFamily: "Montserrat, sans-serif",
                        fontWeight: 700,
                        fontSize: 22,
                        color: "var(--primary)",
                        marginTop: 4,
                      }}
                    >
                      Ksh {totalPayable.toLocaleString()}
                    </div>
                    <div
                      style={{
                        fontFamily: "Inter, sans-serif",
                        fontSize: 12,
                        color: period === 0 || isFullPayment ? "var(--available)" : "var(--accent)",
                        fontWeight: 500,
                      }}
                    >
                      {period === 0 || isFullPayment
                        ? "✓ 5% Cash Discount applied"
                        : period === 3
                          ? "+ Ksh 30,000 surcharge included"
                          : period === 6
                            ? "+ Ksh 50,000 surcharge included"
                            : "+ Ksh 100,000 surcharge included"}
                    </div>
                  </div>
                </div>
              </div>
              <div
                style={{
                  fontFamily: "Inter, sans-serif",
                  fontStyle: "italic",
                  fontSize: 12,
                  color: "var(--muted-foreground)",
                  marginTop: 12,
                }}
              >
                This calculator is for planning purposes only. Final payment terms are confirmed in
                your purchase agreement.
              </div>
            </div>

            {/* Payment panel */}
            <aside className="lg:sticky lg:top-[200px] lg:self-start">
              <div
                style={{
                  background: "#FFFFFF",
                  borderRadius: 12,
                  overflow: "hidden",
                  boxShadow: "0 4px 24px rgba(11,127,199,0.08)",
                  border: "1px solid #E5E0D8",
                }}
              >
                <div style={{ background: "var(--primary)", padding: 24 }}>
                  <div
                    style={{
                      fontFamily: "Inter, sans-serif",
                      fontWeight: 600,
                      fontSize: 13,
                      color: "rgba(255,255,255,0.65)",
                    }}
                  >
                    Plot #{form.plotNumber} — {form.phaseName}
                  </div>
                  <div
                    style={{
                      fontFamily: "Montserrat, sans-serif",
                      fontWeight: 500,
                      fontSize: 11,
                      color: "var(--accent)",
                      letterSpacing: "0.15em",
                      textTransform: "uppercase",
                      marginTop: 12,
                    }}
                  >
                    Deposit Amount
                  </div>
                  <div
                    style={{
                      fontFamily: "Montserrat, sans-serif",
                      fontWeight: 700,
                      fontSize: 36,
                      color: "#FFFFFF",
                      marginTop: 4,
                    }}
                  >
                    Ksh {deposit.toLocaleString()}
                  </div>
                  <div
                    style={{
                      fontFamily: "Inter, sans-serif",
                      fontSize: 13,
                      color: "rgba(255,255,255,0.6)",
                      marginTop: 4,
                    }}
                  >
                    = {pct}% of Ksh {totalPrice.toLocaleString()}
                  </div>
                </div>

                <div style={{ padding: 24 }}>
                  <div
                    style={{
                      fontFamily: "Montserrat, sans-serif",
                      fontWeight: 500,
                      fontSize: 10,
                      color: "var(--muted-foreground)",
                      letterSpacing: "0.2em",
                      marginBottom: 10,
                    }}
                  >
                    ORDER SUMMARY
                  </div>
                  <div
                    style={{
                      fontFamily: "Inter, sans-serif",
                      fontSize: 13,
                      color: "var(--muted-foreground)",
                    }}
                  >
                    <div className="flex justify-between mb-1.5">
                      <span>Plot #{form.plotNumber}</span>
                      <span>Ksh {totalPrice.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between mb-1.5">
                      <span>Deposit now</span>
                      <span>Ksh {deposit.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between mb-1.5">
                      <span>Balance</span>
                      <span>Ksh {Math.max(0, balance).toLocaleString()}</span>
                    </div>
                    {!isFullPayment && period === 0 && (
                      <div className="flex justify-between mb-1.5">
                        <span>Plan</span>
                        <span>Cash (30 days)</span>
                      </div>
                    )}
                    {!isFullPayment && period > 0 && (
                      <div className="flex justify-between mb-1.5">
                        <span>Monthly</span>
                        <span>
                          Ksh {monthly.toLocaleString()}/mo × {period}
                        </span>
                      </div>
                    )}
                    <div style={{ height: 1, background: "#E5E0D8", margin: "8px 0" }} />
                    <div
                      className="flex justify-between"
                      style={{
                        fontFamily: "Inter, sans-serif",
                        fontWeight: 700,
                        fontSize: 15,
                        color: "var(--primary)",
                      }}
                    >
                      <span>TOTAL PAYABLE</span>
                      <span>Ksh {totalPayable.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="my-5" style={{ height: 1, background: "#E5E0D8" }} />

                  <div
                    style={{
                      fontFamily: "Montserrat, sans-serif",
                      fontWeight: 500,
                      fontSize: 11,
                      color: "var(--muted-foreground)",
                      letterSpacing: "0.15em",
                      marginBottom: 10,
                    }}
                  >
                    PAY DEPOSIT VIA
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {METHODS.map((m) => {
                      const sel = method === m.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setMethod(m.id)}
                          style={{
                            border: `1.5px solid ${sel ? "var(--primary)" : "#E5E0D8"}`,
                            background: sel ? "var(--stone)" : "#FFFFFF",
                            borderRadius: 8,
                            padding: "12px 6px",
                            textAlign: "center",
                            cursor: "pointer",
                            fontFamily: "Inter, sans-serif",
                            fontWeight: sel ? 600 : 500,
                            fontSize: 12,
                            color: "var(--primary)",
                          }}
                        >
                          <div style={{ fontSize: 18, marginBottom: 4 }}>{m.icon}</div>
                          {m.label}
                        </button>
                      );
                    })}
                  </div>

                  {verifyError && (
                    <div
                      style={{
                        background: "#FEE2E2",
                        border: "1px solid #FECACA",
                        color: "#DC2626",
                        fontFamily: "Inter, sans-serif",
                        fontSize: 13,
                        padding: "12px 14px",
                        borderRadius: 8,
                        marginTop: 16,
                      }}
                    >
                      {verifyError}
                    </div>
                  )}

                  <button
                    onClick={handlePay}
                    disabled={verifying}
                    className="mt-5"
                    style={{
                      width: "100%",
                      background: "var(--accent)",
                      color: "#FFFFFF",
                      fontFamily: "Inter, sans-serif",
                      fontWeight: 700,
                      fontSize: 15,
                      padding: "18px 0",
                      borderRadius: 8,
                      border: "none",
                      cursor: verifying ? "not-allowed" : "pointer",
                      opacity: verifying ? 0.7 : 1,
                    }}
                  >
                    {verifying
                      ? "Confirming your payment…"
                      : `Pay Ksh ${deposit.toLocaleString()} Securely →`}
                  </button>
                  <div
                    style={{
                      fontFamily: "Inter, sans-serif",
                      fontSize: 12,
                      color: "var(--muted-foreground)",
                      textAlign: "center",
                      marginTop: 8,
                    }}
                  >
                    🔒 Secured by Paystack
                  </div>
                  <div
                    className="mt-3 flex flex-wrap items-center justify-center gap-3"
                    style={{
                      fontFamily: "Inter, sans-serif",
                      fontSize: 11,
                      color: "var(--muted-foreground)",
                    }}
                  >
                    <span>🔒 SSL Encrypted</span>
                    <span>✅ Paystack Secured</span>
                    <span>🇰🇪 M-Pesa Ready</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => window.history.back()}
                    className="mt-3"
                    style={{
                      width: "100%",
                      background: "none",
                      border: "none",
                      fontFamily: "Inter, sans-serif",
                      fontSize: 13,
                      color: "var(--accent)",
                      cursor: "pointer",
                    }}
                  >
                    ← Back to Site Visit Booking
                  </button>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
      <Footer />
      <WhatsAppButton />
    </div>
  );
}
