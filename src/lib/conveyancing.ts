/**
 * Gatepath Realtors — 5-Stage Title Deed Conveyancing Pipeline
 * Single source of truth, used on the public landing page (so a buyer sees
 * the full journey before committing) and in the client portal (where they
 * track their own actual progress against it). Keeping these in one place
 * means a buyer recognizes the exact same pipeline in both places, and a
 * future edit can't accidentally make them drift apart.
 */
export const CONVEYANCING_STAGES = [
  {
    stage: 1,
    label: "Payment Verification & Receipt Issued",
    desc: "Down payment confirmed & legal file opened",
  },
  {
    stage: 2,
    label: "Cadastral Survey & Beaconing",
    desc: "Physical survey beacons placed on site",
  },
  {
    stage: 3,
    label: "Sales Agreement Executed",
    desc: "Bilateral agreement signed by CEO & buyer",
  },
  {
    stage: 4,
    label: "Ministry of Lands Stamp Duty & Search",
    desc: "Land registry stamp duty and search filing",
  },
  {
    stage: 5,
    label: "Title Deed Issued & Dispatched",
    desc: "Official title deed ready & delivered",
  },
] as const;
