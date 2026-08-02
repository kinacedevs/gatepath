/**
 * Gatepath Realtors — Goals & Quotas (Part 2, Module 13)
 * Pure functions, no I/O — mirrors commissions.ts's shape: "actual" is
 * computed live from data already fetched, never stored on the goal row.
 *
 * revenue_kes/deals_closed are true period-flow metrics (payments/
 * agreements strictly dated within [period_start, period_end)). plots_sold
 * is a snapshot (phases.sold_count as of now) — there's no
 * plot_status_history table recording when a plot's status changed, so a
 * period-scoped "sold within this window" count isn't real data. Flagged
 * via isSnapshot rather than faked as a period-flow number.
 */

interface GoalAgent {
  id: string;
  email: string;
  full_name: string | null;
}

interface GoalPhase {
  id: string;
  name: string;
  slug: string;
  sold_count: number;
}

interface GoalInquiry {
  id: string;
  cro_name: string | null;
  phase_slug: string | null;
}

interface GoalAgreement {
  inquiry_id: string | null;
  ceo_signed: boolean;
  ceo_signed_at: string | null;
  created_at: string;
}

interface GoalPayment {
  inquiry_id: string | null;
  amount: number;
  created_at: string;
}

export interface GoalRow {
  id: string;
  agent_id: string | null;
  phase_id: string | null;
  metric: "revenue_kes" | "deals_closed" | "plots_sold";
  period_type: "month" | "quarter";
  period_start: string;
  target_value: number;
}

export function periodBounds(periodType: "month" | "quarter", periodStart: string) {
  const start = new Date(periodStart);
  const end = new Date(start);
  end.setMonth(end.getMonth() + (periodType === "month" ? 1 : 3));
  return { start, end };
}

export function periodLabel(periodType: "month" | "quarter", periodStart: string): string {
  const d = new Date(periodStart);
  if (periodType === "month") {
    return d.toLocaleDateString("en-KE", { month: "long", year: "numeric" });
  }
  const quarter = Math.floor(d.getMonth() / 3) + 1;
  return `Q${quarter} ${d.getFullYear()}`;
}

export interface GoalProgress {
  goal: GoalRow;
  entityType: "agent" | "phase";
  entityName: string;
  actual: number;
  target: number;
  attainmentPct: number;
  achieved: boolean;
  isSnapshot: boolean;
  periodLabel: string;
}

export function computeGoalProgress(
  goals: GoalRow[],
  agents: GoalAgent[],
  phases: GoalPhase[],
  inquiries: GoalInquiry[],
  agreements: GoalAgreement[],
  payments: GoalPayment[],
): GoalProgress[] {
  return goals
    .map((goal): GoalProgress | null => {
      const { start, end } = periodBounds(goal.period_type, goal.period_start);
      const label = periodLabel(goal.period_type, goal.period_start);

      if (goal.agent_id) {
        const agent = agents.find((a) => a.id === goal.agent_id);
        if (!agent) return null;

        const matchingInquiryIds = new Set(
          inquiries
            .filter((inq) => inq.cro_name === agent.full_name || inq.cro_name === agent.email)
            .map((inq) => inq.id),
        );

        let actual = 0;
        const isSnapshot = false;
        if (goal.metric === "revenue_kes") {
          actual = payments
            .filter((p) => {
              if (!p.inquiry_id || !matchingInquiryIds.has(p.inquiry_id)) return false;
              const d = new Date(p.created_at);
              return d >= start && d < end;
            })
            .reduce((sum, p) => sum + Number(p.amount), 0);
        } else if (goal.metric === "deals_closed") {
          actual = agreements.filter((a) => {
            if (!a.ceo_signed || !a.inquiry_id || !matchingInquiryIds.has(a.inquiry_id))
              return false;
            const d = new Date(a.ceo_signed_at ?? a.created_at);
            return d >= start && d < end;
          }).length;
        }

        return {
          goal,
          entityType: "agent",
          entityName: agent.full_name || agent.email,
          actual,
          target: goal.target_value,
          attainmentPct: goal.target_value > 0 ? Math.round((actual / goal.target_value) * 100) : 0,
          achieved: actual >= goal.target_value,
          isSnapshot,
          periodLabel: label,
        };
      }

      if (goal.phase_id) {
        const phase = phases.find((p) => p.id === goal.phase_id);
        if (!phase) return null;

        const matchingInquiryIds = new Set(
          inquiries.filter((inq) => inq.phase_slug === phase.slug).map((inq) => inq.id),
        );

        let actual = 0;
        let isSnapshot = false;
        if (goal.metric === "revenue_kes") {
          actual = payments
            .filter((p) => {
              if (!p.inquiry_id || !matchingInquiryIds.has(p.inquiry_id)) return false;
              const d = new Date(p.created_at);
              return d >= start && d < end;
            })
            .reduce((sum, p) => sum + Number(p.amount), 0);
        } else if (goal.metric === "deals_closed") {
          actual = agreements.filter((a) => {
            if (!a.ceo_signed || !a.inquiry_id || !matchingInquiryIds.has(a.inquiry_id))
              return false;
            const d = new Date(a.ceo_signed_at ?? a.created_at);
            return d >= start && d < end;
          }).length;
        } else if (goal.metric === "plots_sold") {
          actual = phase.sold_count;
          isSnapshot = true;
        }

        return {
          goal,
          entityType: "phase",
          entityName: phase.name,
          actual,
          target: goal.target_value,
          attainmentPct: goal.target_value > 0 ? Math.round((actual / goal.target_value) * 100) : 0,
          achieved: actual >= goal.target_value,
          isSnapshot,
          periodLabel: label,
        };
      }

      return null;
    })
    .filter((g): g is GoalProgress => g !== null)
    .sort(
      (a, b) => new Date(b.goal.period_start).getTime() - new Date(a.goal.period_start).getTime(),
    );
}
