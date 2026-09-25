import type { CandidateApplication } from "../types";
import type { ProjectSnapshot } from "../snapshot";
import type { DependencyGraph } from "./types";

export interface GraphBuildInput {
  candidate: CandidateApplication;
  snapshot: ProjectSnapshot;
}

export interface DependencyGraphProvider {
  readonly id: string;
  supports(input: GraphBuildInput): boolean;
  build(input: GraphBuildInput): DependencyGraph | null;
}

export function selectGraph({
  providers,
  input,
}: {
  providers: DependencyGraphProvider[];
  input: GraphBuildInput;
}) {
  for (const provider of providers) {
    if (!provider.supports(input)) continue;
    const graph = provider.build(input);
    if (graph != null) return graph;
  }
  return null;
}
