import type {
  CandidateApplication,
  Diagnostic,
  Evidence,
  LanguageId,
} from "../types";
import type { ProjectSnapshot } from "../snapshot";

export type DiscoveryCompleteness = "resolved" | "partial" | "inventory-only";

export interface DiscoveryProvenance {
  provider: string;
  path: string;
  workspaceRoot?: string;
  target?: string;
  rule?: string;
}

export interface ApplicationDiscovery {
  completeness: DiscoveryCompleteness;
  provenance: DiscoveryProvenance;
}

export interface DiscoveredApplication {
  directory: string;
  idSuffix?: string;
  name: string;
  language: LanguageId;
  runtime: string;
  entrypoints?: { path: string; command?: string }[];
  evidence: Evidence[];
  discovery: ApplicationDiscovery;
  diagnostics?: Diagnostic[];
}

export interface ApplicationDiscoveryResult {
  candidates: CandidateApplication[];
  diagnostics: Diagnostic[];
}

export interface ApplicationDiscoveryProvider {
  readonly id: string;
  discover(snapshot: ProjectSnapshot): ApplicationDiscoveryResult;
}
