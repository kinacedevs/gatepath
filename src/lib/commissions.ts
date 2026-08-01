/**
 * Gatepath Realtors — Commission & Payout Tracking (Part 2, Module 12)
 * Pure functions, no I/O — mirrors escalations.ts's/dataGovernance.ts's
 * shape: computed live from data already fetched, never stored.
 *
 * "Closed deal" = agreements.ceo_signed === true, the same set Agent
 * Performance and Closed Deals already use. Per Phase 7's own payment
 * logic, an agreements row is only ever created once an inquiry's
 * successful payments reach its full price — so every closed deal is,
 * by construction, already fully collected. No separate "is this deal
 * fully paid" gate is needed here.
 *
 * Payout status is NOT computed — it's the one genuinely stateful fact in
 * this module (a real event that happened or didn't), read from the
 * commission_payouts table (one row per (inquiry_id, agent_email) pair,
 * created only when actually marked paid — row absence means pending).
 */

interface CommInquiry {
  id: string;
  client_full_name: string;
  cro_name: string | null;
}

interface CommAgreement {
  inquiry_id: string | null;
  ceo_signed: boolean;
}

interface CommPayment {
  inquiry_id: string | null;
  amount: number;
}

interface CommAgent {
  id: string;
  email: string;
  full_name: string | null;
  role: "ceo" | "manager" | "agent";
  commission_rate: number | null;
}

interface CommPayout {
  inquiry_id: string;
  agent_email: string;
}

export interface CommissionDealLine {
  inquiryId: string;
  clientName: string;
  collectedRevenueKes: number;
  commissionAmountKes: number;
  paid: boolean;
}

export interface AgentCommissionSummary {
  agent: CommAgent;
  dealCount: number;
  totalCommissionKes: number;
  paidKes: number;
  pendingKes: number;
  deals: CommissionDealLine[];
}

export function computeAgentCommissions(
  agents: CommAgent[],
  inquiries: CommInquiry[],
  agreements: CommAgreement[],
  payments: CommPayment[],
  payouts: CommPayout[],
): AgentCommissionSummary[] {
  const collectedByInquiry = new Map<string, number>();
  for (const p of payments) {
    if (!p.inquiry_id) continue;
    collectedByInquiry.set(
      p.inquiry_id,
      (collectedByInquiry.get(p.inquiry_id) ?? 0) + Number(p.amount),
    );
  }

  const closedInquiryIds = new Set(
    agreements.filter((a) => a.ceo_signed && a.inquiry_id).map((a) => a.inquiry_id as string),
  );

  const paidPairs = new Set(payouts.map((p) => `${p.inquiry_id}::${p.agent_email}`));

  return agents
    .filter((agent) => agent.role === "agent" && agent.commission_rate != null)
    .map((agent) => {
      const agentDeals = inquiries.filter(
        (inq) =>
          closedInquiryIds.has(inq.id) &&
          (inq.cro_name === agent.full_name || inq.cro_name === agent.email),
      );

      const deals: CommissionDealLine[] = agentDeals.map((inq) => {
        const collectedRevenueKes = collectedByInquiry.get(inq.id) ?? 0;
        const commissionAmountKes = collectedRevenueKes * (agent.commission_rate ?? 0);
        const paid = paidPairs.has(`${inq.id}::${agent.email}`);
        return {
          inquiryId: inq.id,
          clientName: inq.client_full_name,
          collectedRevenueKes,
          commissionAmountKes,
          paid,
        };
      });

      const totalCommissionKes = deals.reduce((sum, d) => sum + d.commissionAmountKes, 0);
      const paidKes = deals
        .filter((d) => d.paid)
        .reduce((sum, d) => sum + d.commissionAmountKes, 0);
      const pendingKes = totalCommissionKes - paidKes;

      return {
        agent,
        dealCount: deals.length,
        totalCommissionKes,
        paidKes,
        pendingKes,
        deals,
      };
    })
    .sort((a, b) => b.totalCommissionKes - a.totalCommissionKes);
}
