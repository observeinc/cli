/**
 * Map of coding agents the CLI installs skills into, with the skills
 * directory each one reads in global and project (repo-local) modes. Directories
 * follow vercel-labs/skills.
 *
 * An agent is "detected" when its base dir — the parent of its global skills
 * dir, i.e. the agent's config home — exists. Detection always uses the global
 * base dir, even in project mode: it answers "does the user use this agent?",
 * which then decides where a project-local skill gets symlinked.
 */
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

export interface Agent {
  /** Display name, e.g. "Claude Code". */
  name: string;
  /** Absolute global skills dir, e.g. `~/.claude/skills`. */
  globalSkillsDir: string;
  /** Repo-relative project skills dir, e.g. `.claude/skills`. */
  projectSkillsDir: string;
}

/** Build the agent map rooted at `home` (defaults to the current user's). */
export function getAgents(home: string = homedir()): Agent[] {
  return [
    {
      name: "AdaL",
      globalSkillsDir: join(home, ".adal", "skills"),
      projectSkillsDir: join(".adal", "skills"),
    },
    {
      name: "AiderDesk",
      globalSkillsDir: join(home, ".aider-desk", "skills"),
      projectSkillsDir: join(".aider-desk", "skills"),
    },
    {
      name: "Amp",
      globalSkillsDir: join(home, ".config", "agents", "skills"),
      projectSkillsDir: join(".agents", "skills"),
    },
    {
      name: "Antigravity",
      globalSkillsDir: join(home, ".gemini", "antigravity", "skills"),
      projectSkillsDir: join(".agents", "skills"),
    },
    {
      name: "Antigravity CLI",
      globalSkillsDir: join(home, ".gemini", "antigravity-cli", "skills"),
      projectSkillsDir: join(".agents", "skills"),
    },
    {
      name: "AstrBot",
      globalSkillsDir: join(home, ".astrbot", "data", "skills"),
      projectSkillsDir: join("data", "skills"),
    },
    {
      name: "Augment",
      globalSkillsDir: join(home, ".augment", "skills"),
      projectSkillsDir: join(".augment", "skills"),
    },
    {
      name: "Autohand Code CLI",
      globalSkillsDir: join(home, ".autohand", "skills"),
      projectSkillsDir: join(".autohand", "skills"),
    },
    {
      name: "IBM Bob",
      globalSkillsDir: join(home, ".bob", "skills"),
      projectSkillsDir: join(".bob", "skills"),
    },
    {
      name: "Claude Code",
      globalSkillsDir: join(home, ".claude", "skills"),
      projectSkillsDir: join(".claude", "skills"),
    },
    {
      name: "Cline",
      globalSkillsDir: join(home, ".agents", "skills"),
      projectSkillsDir: join(".agents", "skills"),
    },
    {
      name: "CodeArts Agent",
      globalSkillsDir: join(home, ".codeartsdoer", "skills"),
      projectSkillsDir: join(".codeartsdoer", "skills"),
    },
    {
      name: "CodeBuddy",
      globalSkillsDir: join(home, ".codebuddy", "skills"),
      projectSkillsDir: join(".codebuddy", "skills"),
    },
    {
      name: "Codemaker",
      globalSkillsDir: join(home, ".codemaker", "skills"),
      projectSkillsDir: join(".codemaker", "skills"),
    },
    {
      name: "Code Studio",
      globalSkillsDir: join(home, ".codestudio", "skills"),
      projectSkillsDir: join(".codestudio", "skills"),
    },
    {
      name: "Codex",
      globalSkillsDir: join(home, ".codex", "skills"),
      projectSkillsDir: join(".agents", "skills"),
    },
    {
      name: "Command Code",
      globalSkillsDir: join(home, ".commandcode", "skills"),
      projectSkillsDir: join(".commandcode", "skills"),
    },
    {
      name: "Continue",
      globalSkillsDir: join(home, ".continue", "skills"),
      projectSkillsDir: join(".continue", "skills"),
    },
    {
      name: "Cortex Code",
      globalSkillsDir: join(home, ".snowflake", "cortex", "skills"),
      projectSkillsDir: join(".cortex", "skills"),
    },
    {
      name: "Crush",
      globalSkillsDir: join(home, ".config", "crush", "skills"),
      projectSkillsDir: join(".crush", "skills"),
    },
    {
      name: "Cursor",
      globalSkillsDir: join(home, ".cursor", "skills"),
      projectSkillsDir: join(".agents", "skills"),
    },
    {
      name: "Deep Agents",
      globalSkillsDir: join(home, ".deepagents", "agent", "skills"),
      projectSkillsDir: join(".agents", "skills"),
    },
    {
      name: "Devin",
      globalSkillsDir: join(home, ".config", "devin", "skills"),
      projectSkillsDir: join(".devin", "skills"),
    },
    {
      name: "Dexto",
      globalSkillsDir: join(home, ".agents", "skills"),
      projectSkillsDir: join(".agents", "skills"),
    },
    {
      name: "Droid",
      globalSkillsDir: join(home, ".factory", "skills"),
      projectSkillsDir: join(".factory", "skills"),
    },
    {
      name: "Firebender",
      globalSkillsDir: join(home, ".firebender", "skills"),
      projectSkillsDir: join(".agents", "skills"),
    },
    {
      name: "ForgeCode",
      globalSkillsDir: join(home, ".forge", "skills"),
      projectSkillsDir: join(".forge", "skills"),
    },
    {
      name: "Gemini CLI",
      globalSkillsDir: join(home, ".gemini", "skills"),
      projectSkillsDir: join(".agents", "skills"),
    },
    {
      name: "GitHub Copilot",
      globalSkillsDir: join(home, ".copilot", "skills"),
      projectSkillsDir: join(".agents", "skills"),
    },
    {
      name: "Goose",
      globalSkillsDir: join(home, ".config", "goose", "skills"),
      projectSkillsDir: join(".goose", "skills"),
    },
    {
      name: "Hermes Agent",
      globalSkillsDir: join(home, ".hermes", "skills"),
      projectSkillsDir: join(".hermes", "skills"),
    },
    {
      name: "iFlow CLI",
      globalSkillsDir: join(home, ".iflow", "skills"),
      projectSkillsDir: join(".iflow", "skills"),
    },
    {
      name: "inference.sh",
      globalSkillsDir: join(home, ".inferencesh", "skills"),
      projectSkillsDir: join(".inferencesh", "skills"),
    },
    {
      name: "Jazz",
      globalSkillsDir: join(home, ".jazz", "skills"),
      projectSkillsDir: join(".jazz", "skills"),
    },
    {
      name: "Junie",
      globalSkillsDir: join(home, ".junie", "skills"),
      projectSkillsDir: join(".junie", "skills"),
    },
    {
      name: "Kilo Code",
      globalSkillsDir: join(home, ".kilocode", "skills"),
      projectSkillsDir: join(".kilocode", "skills"),
    },
    {
      name: "Kimi Code CLI",
      globalSkillsDir: join(home, ".agents", "skills"),
      projectSkillsDir: join(".agents", "skills"),
    },
    {
      name: "Kiro CLI",
      globalSkillsDir: join(home, ".kiro", "skills"),
      projectSkillsDir: join(".kiro", "skills"),
    },
    {
      name: "Kode",
      globalSkillsDir: join(home, ".kode", "skills"),
      projectSkillsDir: join(".kode", "skills"),
    },
    {
      name: "Lingma",
      globalSkillsDir: join(home, ".lingma", "skills"),
      projectSkillsDir: join(".lingma", "skills"),
    },
    {
      name: "Loaf",
      globalSkillsDir: join(home, ".agents", "skills"),
      projectSkillsDir: join(".agents", "skills"),
    },
    {
      name: "MCPJam",
      globalSkillsDir: join(home, ".mcpjam", "skills"),
      projectSkillsDir: join(".mcpjam", "skills"),
    },
    {
      name: "Mistral Vibe",
      globalSkillsDir: join(home, ".vibe", "skills"),
      projectSkillsDir: join(".vibe", "skills"),
    },
    {
      name: "Moxby",
      globalSkillsDir: join(home, ".moxby", "skills"),
      projectSkillsDir: join(".moxby", "skills"),
    },
    {
      name: "Mux",
      globalSkillsDir: join(home, ".mux", "skills"),
      projectSkillsDir: join(".mux", "skills"),
    },
    {
      name: "Neovate",
      globalSkillsDir: join(home, ".neovate", "skills"),
      projectSkillsDir: join(".neovate", "skills"),
    },
    {
      name: "Ona",
      globalSkillsDir: join(home, ".ona", "skills"),
      projectSkillsDir: join(".ona", "skills"),
    },
    {
      name: "OpenClaw",
      globalSkillsDir: join(home, ".openclaw", "skills"),
      projectSkillsDir: join("skills"),
    },
    {
      name: "OpenHands",
      globalSkillsDir: join(home, ".openhands", "skills"),
      projectSkillsDir: join(".openhands", "skills"),
    },
    {
      name: "opencode",
      globalSkillsDir: join(home, ".config", "opencode", "skills"),
      projectSkillsDir: join(".agents", "skills"),
    },
    {
      name: "Pi",
      globalSkillsDir: join(home, ".pi", "agent", "skills"),
      projectSkillsDir: join(".pi", "skills"),
    },
    {
      name: "Pochi",
      globalSkillsDir: join(home, ".pochi", "skills"),
      projectSkillsDir: join(".pochi", "skills"),
    },
    {
      name: "Qoder",
      globalSkillsDir: join(home, ".qoder", "skills"),
      projectSkillsDir: join(".qoder", "skills"),
    },
    {
      name: "Qoder CN",
      globalSkillsDir: join(home, ".qoder-cn", "skills"),
      projectSkillsDir: join(".qoder", "skills"),
    },
    {
      name: "Qwen Code",
      globalSkillsDir: join(home, ".qwen", "skills"),
      projectSkillsDir: join(".qwen", "skills"),
    },
    {
      name: "Reasonix",
      globalSkillsDir: join(home, ".reasonix", "skills"),
      projectSkillsDir: join(".reasonix", "skills"),
    },
    {
      name: "Replit",
      globalSkillsDir: join(home, ".config", "agents", "skills"),
      projectSkillsDir: join(".agents", "skills"),
    },
    {
      name: "Roo Code",
      globalSkillsDir: join(home, ".roo", "skills"),
      projectSkillsDir: join(".roo", "skills"),
    },
    {
      name: "Rovo Dev",
      globalSkillsDir: join(home, ".rovodev", "skills"),
      projectSkillsDir: join(".rovodev", "skills"),
    },
    {
      name: "Tabnine CLI",
      globalSkillsDir: join(home, ".tabnine", "agent", "skills"),
      projectSkillsDir: join(".tabnine", "agent", "skills"),
    },
    {
      name: "Terramind",
      globalSkillsDir: join(home, ".terramind", "skills"),
      projectSkillsDir: join(".terramind", "skills"),
    },
    {
      name: "Tinycloud",
      globalSkillsDir: join(home, ".tinycloud", "skills"),
      projectSkillsDir: join(".tinycloud", "skills"),
    },
    {
      name: "Trae",
      globalSkillsDir: join(home, ".trae", "skills"),
      projectSkillsDir: join(".trae", "skills"),
    },
    {
      name: "Trae CN",
      globalSkillsDir: join(home, ".trae-cn", "skills"),
      projectSkillsDir: join(".trae", "skills"),
    },
    {
      name: "Universal",
      globalSkillsDir: join(home, ".config", "agents", "skills"),
      projectSkillsDir: join(".agents", "skills"),
    },
    {
      name: "Warp",
      globalSkillsDir: join(home, ".agents", "skills"),
      projectSkillsDir: join(".agents", "skills"),
    },
    {
      name: "Windsurf",
      globalSkillsDir: join(home, ".codeium", "windsurf", "skills"),
      projectSkillsDir: join(".windsurf", "skills"),
    },
    {
      name: "ZCode",
      globalSkillsDir: join(home, ".zcode", "skills"),
      projectSkillsDir: join(".zcode", "skills"),
    },
    {
      name: "Zed",
      globalSkillsDir: join(home, ".agents", "skills"),
      projectSkillsDir: join(".agents", "skills"),
    },
    {
      name: "Zencoder",
      globalSkillsDir: join(home, ".zencoder", "skills"),
      projectSkillsDir: join(".zencoder", "skills"),
    },
    {
      name: "Zenflow",
      globalSkillsDir: join(home, ".zencoder", "skills"),
      projectSkillsDir: join(".zencoder", "skills"),
    },
  ];
}

/**
 * The agents present on this machine: those whose base dir (the parent of the
 * global skills dir) exists. Filesystem access is injectable so tests can point
 * at a fake home.
 */
export function detectAgents({
  home = homedir(),
  existsImpl = existsSync,
}: {
  home?: string;
  existsImpl?: (path: string) => boolean;
} = {}): Agent[] {
  return getAgents(home).filter((agent) =>
    existsImpl(dirname(agent.globalSkillsDir)),
  );
}
