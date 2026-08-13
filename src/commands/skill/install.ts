import { defineCommand } from "../../lib/stricli-wrappers";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import type { LocalContext } from "../../context";
import { getSkill } from "../../rest/skill/get-skill";
import { listSkills } from "../../rest/skill/list-skills";
import {
  getBundledRepo,
  listBundledCatalog,
  readBundledSkillFiles,
} from "../../lib/skills/bundled-repo";
import { detectAgents, type Agent } from "../../lib/skills/agents";
import {
  installSkill,
  synthesizeUserSkill,
  type InstalledPath,
  type SkippedTarget,
} from "../../lib/skills/install-target";
import { loadConfig } from "../../lib/config";
import { formatApiError } from "../../lib/format-error";
import type { Writer } from "../../lib/writer";
import {
  displayPath,
  makeFail,
  warnSkippedTargets,
  type PathContext,
} from "./report";

interface InstallSkillFlags {
  userDefined?: boolean;
  all?: boolean;
  project?: boolean;
}

/** A skill resolved to the directory name and file set that get installed. */
interface ResolvedSkill {
  name: string;
  files: Map<string, Uint8Array>;
}

/** The resolve outcome: the skills to install, plus any requested but not found. */
interface ResolveResult {
  skills: ResolvedSkill[];
  missing: string[];
}

export interface InstallSkillDeps {
  loadConfig?: typeof loadConfig;
  getBundledRepo?: typeof getBundledRepo;
  listBundledCatalog?: typeof listBundledCatalog;
  readBundledSkillFiles?: typeof readBundledSkillFiles;
  getSkill?: typeof getSkill;
  listSkills?: typeof listSkills;
  detectAgents?: typeof detectAgents;
  installSkill?: typeof installSkill;
  home?: string;
  cwd?: string;
  /** Report a failure as a warning and leave the exit code alone. */
  bestEffort?: boolean;
}

/** Upper bound when enumerating user-defined skills for `--all`. */
const USER_DEFINED_ALL_LIMIT = 1000;

/**
 * Thin stricli entrypoint. The `skill` positional is an array, which stricli
 * spreads into rest args — so the testable core (which also takes injectable
 * `deps`) lives in `installSkills`.
 */
export async function install(
  this: LocalContext,
  flags: InstallSkillFlags,
  ...skills: string[]
): Promise<void> {
  await installSkills(this, flags, skills);
}

export async function installSkills(
  ctx: LocalContext,
  flags: InstallSkillFlags,
  skills: string[],
  deps: InstallSkillDeps = {},
): Promise<void> {
  const {
    loadConfig: loadConfigImpl = loadConfig,
    getBundledRepo: getBundledRepoImpl = getBundledRepo,
    listBundledCatalog: listBundledCatalogImpl = listBundledCatalog,
    readBundledSkillFiles: readBundledSkillFilesImpl = readBundledSkillFiles,
    getSkill: getSkillImpl = getSkill,
    listSkills: listSkillsImpl = listSkills,
    detectAgents: detectAgentsImpl = detectAgents,
    installSkill: installSkillImpl = installSkill,
  } = deps;
  const { process, writer } = ctx;
  const home = deps.home ?? homedir();
  const cwd = deps.cwd ?? process.cwd();

  const all = flags.all === true;
  const project = flags.project === true;
  const userDefined = flags.userDefined === true;
  const bestEffort = deps.bestEffort === true;
  const paths: PathContext = { home, cwd, project };

  const fail = makeFail({ writer, process, bestEffort });

  // Drop duplicate names so a skill isn't installed (and printed) twice.
  const requested = [...new Set(skills)];

  // Nothing to install without either a skill name or --all. The interactive
  // picker for this case is a later step; here it is simply an error.
  if (requested.length === 0 && !all) {
    fail("no skill name given (pass a name, or --all)");
    return;
  }

  try {
    writer.info("Installing...");

    const { skills: resolved, missing } = userDefined
      ? await resolveUserDefined({
          ids: requested,
          all,
          loadConfigImpl,
          getSkillImpl,
          listSkillsImpl,
        })
      : await resolveBundled({
          names: requested,
          all,
          getBundledRepoImpl,
          listBundledCatalogImpl,
          readBundledSkillFilesImpl,
        });

    // Fail fast on any unknown name rather than leaving a partial install.
    if (missing.length > 0) {
      fail(
        `Skill${missing.length > 1 ? "s" : ""} not found: ${missing.join(", ")}`,
      );
      return;
    }

    const agents = detectAgentsImpl(paths);
    const written: InstalledPath[] = [];
    const skipped: SkippedTarget[] = [];
    for (const skill of resolved) {
      const result = installSkillImpl({ ...skill, project, agents, home, cwd });
      written.push(...result.installed);
      skipped.push(...result.skipped);
    }

    printResult(writer, {
      names: resolved.map((s) => s.name),
      written,
      skipped,
      agents,
      paths,
    });
  } catch (error) {
    fail(await formatApiError(error));
  }
}

async function resolveBundled({
  names,
  all,
  getBundledRepoImpl,
  listBundledCatalogImpl,
  readBundledSkillFilesImpl,
}: {
  names: string[];
  all: boolean;
  getBundledRepoImpl: typeof getBundledRepo;
  listBundledCatalogImpl: typeof listBundledCatalog;
  readBundledSkillFilesImpl: typeof readBundledSkillFiles;
}): Promise<ResolveResult> {
  const repo = await getBundledRepoImpl();

  if (all) {
    // Skip any catalog entry that resolves to no files (e.g. a frontmatter name
    // that doesn't match its directory) rather than installing an empty dir.
    const skills = listBundledCatalogImpl(repo)
      .map((entry) => ({
        name: entry.name,
        files: readBundledSkillFilesImpl(repo, entry.name),
      }))
      .filter((skill) => skill.files.size > 0);
    return { skills, missing: [] };
  }

  const skills: ResolvedSkill[] = [];
  const missing: string[] = [];
  for (const name of names) {
    const files = readBundledSkillFilesImpl(repo, name);
    if (files.size === 0) missing.push(name);
    else skills.push({ name, files });
  }
  return { skills, missing };
}

async function resolveUserDefined({
  ids,
  all,
  loadConfigImpl,
  getSkillImpl,
  listSkillsImpl,
}: {
  ids: string[];
  all: boolean;
  loadConfigImpl: typeof loadConfig;
  getSkillImpl: typeof getSkill;
  listSkillsImpl: typeof listSkills;
}): Promise<ResolveResult> {
  const config = loadConfigImpl();

  if (all) {
    // The list endpoint omits content, so fetch each skill's body by id before
    // synthesizing its SKILL.md.
    const { skills: listed } = await listSkillsImpl({
      config,
      limit: USER_DEFINED_ALL_LIMIT,
    });
    const skills: ResolvedSkill[] = [];
    for (const item of listed) {
      const full = await getSkillImpl({ config, skillId: item.id });
      if (full) skills.push(synthesizeUserSkill(full));
    }
    return { skills, missing: [] };
  }

  const skills: ResolvedSkill[] = [];
  const missing: string[] = [];
  for (const id of ids) {
    const skill = await getSkillImpl({ config, skillId: id });
    if (!skill) missing.push(id);
    else skills.push(synthesizeUserSkill(skill));
  }
  return { skills, missing };
}

/**
 * Render the install result: the skill names under the canonical directory, then
 * the agent directories they were linked into — directories only, no per-skill
 * paths. Directories that could not be written are reported after.
 */
function printResult(
  writer: Writer,
  {
    names,
    written,
    skipped,
    agents,
    paths,
  }: {
    names: string[];
    /** Every path the run wrote, canonical copies and agent targets alike. */
    written: InstalledPath[];
    skipped: SkippedTarget[];
    agents: Agent[];
    paths: PathContext;
  },
): void {
  if (names.length === 0) {
    writer.warn("No skills installed.");
    return;
  }

  const { home, cwd, project } = paths;
  const display = (p: string) => displayPath(p, paths);
  const canonicalRoot = join(project ? cwd : home, ".agents", "skills");
  const noun = names.length === 1 ? "skill" : "skills";

  writer.write(
    `Installed ${names.length} ${noun} to ${display(canonicalRoot)}:`,
  );
  for (const name of names) {
    writer.write(`  ${name}`);
  }

  const linkDirs = [
    ...new Set(
      written
        .filter((p) => p.kind !== "canonical")
        .map((p) => display(dirname(p.path))),
    ),
  ];
  if (linkDirs.length > 0) {
    // On the Windows fallback the per-agent targets are copies, not symlinks.
    const verb = written.some((p) => p.kind === "copy")
      ? "Copied"
      : "Symlinked";
    writer.write(`${verb} into ${linkDirs.join(", ")}.`);
  }

  warnSkippedTargets(writer, skipped, paths);
  // Not keyed off the link list: an agent whose skills dir *is* the canonical dir
  // reads that copy directly, so nothing linked can still mean served.
  if (agents.length === 0) {
    writer.warn(
      `No agent skills directories found, so nothing was linked. The skills are in ${display(canonicalRoot)}.`,
    );
  }
}

export const installCommand = defineCommand({
  loader: async () => install,
  parameters: {
    positional: {
      kind: "array",
      parameter: {
        placeholder: "skill",
        brief:
          "Bundled skill name(s), or user-defined skill id(s) with --user-defined; omit with --all",
        parse: String,
      },
    },
    flags: {
      userDefined: {
        kind: "boolean",
        brief:
          "Install user-defined skills by id from the platform, instead of bundled skills by name",
        optional: true,
      },
      all: {
        kind: "boolean",
        brief: "Install every skill in the mode's catalog",
        optional: true,
      },
      project: {
        kind: "boolean",
        brief:
          "Install repo-local (./.agents/skills and per-agent project dirs) instead of globally",
        optional: true,
      },
    },
    aliases: {},
  },
  docs: {
    brief:
      "Install AI agent skills into your coding agents (bundled by default, or user-defined with --user-defined)",
  },
});
