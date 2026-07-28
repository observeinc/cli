import { defineCommand } from "../../lib/stricli-wrappers";
import { homedir } from "node:os";
import { join } from "node:path";
import type { LocalContext } from "../../context";
import {
  getBundledRepo,
  readBundledSkillFiles,
} from "../../lib/skills/bundled-repo";
import {
  installSkill,
  slugifyLabel,
  synthesizeUserSkill,
} from "../../lib/skills/install-target";
import { detectAgents } from "../../lib/skills/agents";
import { skillManifestHash } from "../../lib/skills/hash";
import { loadConfig } from "../../lib/config";
import { listSkills } from "../../rest/skill/list-skills";
import { formatApiError } from "../../lib/format-error";
import type { Writer } from "../../lib/writer";
import {
  listInstalledSkillNames,
  readInstalledSkillFiles,
} from "../../lib/skills/installed-files";

interface UpdateSkillFlags {
  userDefined?: boolean;
  project?: boolean;
}

export interface UpdateSkillDeps {
  loadConfig?: typeof loadConfig;
  getBundledRepo?: typeof getBundledRepo;
  readBundledSkillFiles?: typeof readBundledSkillFiles;
  listSkills?: typeof listSkills;
  detectAgents?: typeof detectAgents;
  installSkill?: typeof installSkill;
  readInstalledSkillFiles?: (canonicalDir: string) => Map<string, Uint8Array>;
  listInstalledSkillNames?: (canonicalRoot: string) => string[];
  home?: string;
  cwd?: string;
}

const USER_DEFINED_UPDATE_LIMIT = 1000;

export async function update(
  this: LocalContext,
  flags: UpdateSkillFlags,
  ...names: string[]
): Promise<void> {
  await updateSkills(this, flags, names);
}

export async function updateSkills(
  ctx: LocalContext,
  flags: UpdateSkillFlags,
  names: string[],
  deps: UpdateSkillDeps = {},
): Promise<void> {
  const {
    loadConfig: loadConfigImpl = loadConfig,
    getBundledRepo: getBundledRepoImpl = getBundledRepo,
    readBundledSkillFiles: readBundledSkillFilesImpl = readBundledSkillFiles,
    listSkills: listSkillsImpl = listSkills,
    detectAgents: detectAgentsImpl = detectAgents,
    installSkill: installSkillImpl = installSkill,
    readInstalledSkillFiles: readInstalledImpl = readInstalledSkillFiles,
    listInstalledSkillNames: listInstalledNamesImpl = listInstalledSkillNames,
  } = deps;

  const { process, writer } = ctx;
  const home = deps.home ?? homedir();
  const cwd = deps.cwd ?? process.cwd();
  const project = flags.project === true;
  const userDefined = flags.userDefined === true;

  const canonicalRoot = join(project ? cwd : home, ".agents", "skills");

  // Drop duplicates; an empty list means "update all installed".
  const requested = [...new Set(names)];
  const named = requested.length > 0;

  try {
    const agents = detectAgentsImpl({ home });
    const installedNames = new Set(listInstalledNamesImpl(canonicalRoot));

    // Fail fast if any requested skill is not installed, before touching anything.
    if (named) {
      const notInstalled = requested.filter((n) => !installedNames.has(n));
      if (notInstalled.length > 0) {
        const s = notInstalled.length === 1 ? "" : "s";
        writer.error(`Skill${s} not installed: ${notInstalled.join(", ")}`);
        process.exitCode = 1;
        return;
      }
    }

    // Compares on-disk files against currentFiles; installs and returns true if outdated.
    function tryUpdate(
      dirName: string,
      currentFiles: Map<string, Uint8Array>,
    ): boolean {
      const installedFiles = readInstalledImpl(join(canonicalRoot, dirName));
      if (skillManifestHash(installedFiles) === skillManifestHash(currentFiles))
        return false;
      installSkillImpl({
        name: dirName,
        files: currentFiles,
        project,
        agents,
        home,
        cwd,
      });
      return true;
    }

    if (userDefined) {
      // Fetch all user-defined skills with full content in one request (expand:true
      // avoids a separate getSkill call per skill).
      const config = loadConfigImpl();
      const { skills: listed } = await listSkillsImpl({
        config,
        expand: true,
        limit: USER_DEFINED_UPDATE_LIMIT,
      });

      if (named) {
        // Named: find each in the platform catalog, compare hashes.
        const updated: string[] = [];
        for (const name of requested) {
          const match = listed.find((s) => slugifyLabel(s.label) === name);
          if (match && tryUpdate(name, synthesizeUserSkill(match).files))
            updated.push(name);
        }
        printUpdateResult(writer, updated);
        return;
      }

      // No-name: walk the platform catalog, update any skill that is installed and outdated.
      const updated: string[] = [];
      for (const skill of listed) {
        const dirName = slugifyLabel(skill.label);
        if (!dirName || !installedNames.has(dirName)) continue;
        if (tryUpdate(dirName, synthesizeUserSkill(skill).files))
          updated.push(dirName);
      }
      printUpdateResult(writer, updated);
    } else {
      // Fetch the upstream repo manifest once, then check each installed skill against it.
      const repo = await getBundledRepoImpl();

      if (named) {
        // Named: look up each in the bundled catalog, compare hashes.
        // Skills absent from the catalog (currentFiles.size === 0) are treated as up to date.
        const updated: string[] = [];
        for (const name of requested) {
          const currentFiles = readBundledSkillFilesImpl(repo, name);
          if (currentFiles.size > 0 && tryUpdate(name, currentFiles))
            updated.push(name);
        }
        printUpdateResult(writer, updated);
        return;
      }

      // No-name: walk installed dirs, skip any not in the bundled catalog, update the rest.
      const updated: string[] = [];
      for (const dirName of installedNames) {
        const currentFiles = readBundledSkillFilesImpl(repo, dirName);
        if (currentFiles.size === 0) continue;
        if (tryUpdate(dirName, currentFiles)) updated.push(dirName);
      }
      printUpdateResult(writer, updated);
    }
  } catch (error) {
    writer.error(`Error: ${await formatApiError(error)}`);
    process.exitCode = 1;
  }
}

function printUpdateResult(writer: Writer, updated: string[]): void {
  if (updated.length === 0) {
    writer.write("All skills are up to date.");
    return;
  }
  const noun = updated.length === 1 ? "skill" : "skills";
  writer.write(`Updated ${updated.length} ${noun}: ${updated.join(", ")}.`);
}

export const updateCommand = defineCommand({
  loader: async () => update,
  parameters: {
    positional: {
      kind: "array",
      parameter: {
        placeholder: "name",
        brief: "Skill name(s) to update; omit to update all installed skills",
        parse: String,
      },
    },
    flags: {
      userDefined: {
        kind: "boolean",
        brief:
          "Update user-defined skills from the platform, instead of bundled skills",
        optional: true,
      },
      project: {
        kind: "boolean",
        brief:
          "Use repo-local canonical dir (./.agents/skills) instead of global",
        optional: true,
      },
    },
    aliases: {},
  },
  docs: {
    brief: "Update installed AI agent skills to the latest version",
  },
});
