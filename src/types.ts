export type WorkflowMode = "dry-run" | "live";

export interface SapTool {
  id: string;
  name: string;
  protocol: string;
  category: string;
  agentAddress?: string;
  priceHint?: string;
}

export interface AceCallResult {
  service: string;
  endpoint: string;
  prompt: string;
  output: string;
  quotedUsd?: number;
  status?: number;
  payment?: {
    transaction?: string;
    amount?: string;
    rawHeaders?: Record<string, string>;
  };
}

export interface WorkflowEvidence {
  runId: string;
  mode: WorkflowMode;
  startedAt: string;
  finishedAt?: string;
  trigger: string;
  market: string;
  selectedTools: SapTool[];
  aceCalls: AceCallResult[];
  finalReport?: string;
}

export interface ProductCandidate {
  id: string;
  name: string;
  query: string;
  targetPriceUsd?: number;
}
