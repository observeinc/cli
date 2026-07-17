import { z } from "zod";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { CONFIG_DIR_MODE, CONFIG_DIR_NAME, CONFIG_FILES } from "./constants";
import { DEFAULT_PROFILE_NAME } from "./profile";

/**
 * Schema for Observe CLI configuration
 */
export const ConfigSchema = z.object({
  customerId: z.string().min(1, "Customer ID is required"),
  domain: z.string().min(1, "Domain is required"),
  token: z.string().min(1, "Token is required"),
  tokenId: z.string().optional(),
  apiUrl: z.string().optional(),
});

export type Config = z.infer<typeof ConfigSchema>;

export const ProfileConfigFileSchema = z.object({
  currentProfile: z.string().default(DEFAULT_PROFILE_NAME),
  profiles: z.record(z.string(), ConfigSchema),
});

type ProfileConfigFile = z.infer<typeof ProfileConfigFileSchema>;

/**
 * Get the configuration directory path
 */
export function getConfigDir(): string {
  const homeDir = os.homedir();
  return path.join(homeDir, CONFIG_DIR_NAME);
}

/**
 * Ensure the config directory exists with restricted permissions (0o700).
 * Creates the directory if missing, or tightens permissions if it already exists.
 */
export function ensureConfigDir(): string {
  const configDir = getConfigDir();

  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true, mode: CONFIG_DIR_MODE });
  } else {
    fs.chmodSync(configDir, CONFIG_DIR_MODE);
  }

  return configDir;
}

/**
 * Get the configuration file path
 */
export function getConfigPath(): string {
  return path.join(getConfigDir(), CONFIG_FILES.config.name);
}

function loadConfigFile(): ProfileConfigFile {
  const configPath = getConfigPath();

  if (!fs.existsSync(configPath)) {
    throw new Error(
      `Configuration not found. Run 'observe auth login' to authenticate.`,
    );
  }

  const raw = fs.readFileSync(configPath, "utf-8");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    fs.unlinkSync(configPath);
    throw new Error(
      `Configuration file was corrupt and has been removed. Run 'observe auth login' to authenticate.`,
    );
  }

  const result = ProfileConfigFileSchema.safeParse(parsed);
  if (!result.success) {
    fs.unlinkSync(configPath);
    throw new Error(
      `Configuration format is no longer valid and has been removed. Run 'observe auth login' to re-authenticate.`,
    );
  }
  return result.data;
}

function saveConfigFile(data: ProfileConfigFile): void {
  ensureConfigDir();
  fs.writeFileSync(getConfigPath(), JSON.stringify(data, null, 2), {
    mode: CONFIG_FILES.config.mode,
  });
}

export function getActiveProfileName(): string {
  const envProfile = process.env.OBSERVE_PROFILE;
  if (envProfile) return envProfile;

  try {
    const file = loadConfigFile();
    return file.currentProfile;
  } catch {
    return DEFAULT_PROFILE_NAME;
  }
}

/**
 * Check if configuration exists for the active profile
 */
export function configExists(): boolean {
  try {
    const file = loadConfigFile();
    const profileName = getActiveProfileName();
    return profileName in file.profiles;
  } catch {
    return false;
  }
}

/**
 * Load configuration for the active profile
 * @throws Error if config doesn't exist or the active profile is missing
 */
export function loadConfig(): Config {
  const file = loadConfigFile();
  const profileName = getActiveProfileName();
  const profile = file.profiles[profileName];

  if (!profile) {
    const available = Object.keys(file.profiles).join(", ");
    throw new Error(
      `Profile "${profileName}" not found. Available profiles: ${available}`,
    );
  }

  return profile;
}

/**
 * Save configuration to the active profile
 */
export function saveConfig(config: Config): void {
  const result = ConfigSchema.safeParse(config);
  if (!result.success) {
    throw new Error(`Invalid configuration:\n${z.prettifyError(result.error)}`);
  }

  let file: ProfileConfigFile;
  try {
    file = loadConfigFile();
  } catch {
    file = { currentProfile: DEFAULT_PROFILE_NAME, profiles: {} };
  }

  const profileName = getActiveProfileName();
  file.profiles[profileName] = result.data;

  if (Object.keys(file.profiles).length === 1) {
    file.currentProfile = profileName;
  }

  saveConfigFile(file);
}

/**
 * Delete the active profile's configuration
 * @returns true if the profile was deleted, false if it didn't exist
 */
export function deleteConfig(): boolean {
  let file: ProfileConfigFile;
  try {
    file = loadConfigFile();
  } catch {
    return false;
  }

  const profileName = getActiveProfileName();
  if (!file.profiles[profileName]) return false;

  file.profiles = Object.fromEntries(
    Object.entries(file.profiles).filter(([k]) => k !== profileName),
  );

  if (Object.keys(file.profiles).length === 0) {
    fs.unlinkSync(getConfigPath());
  } else {
    if (file.currentProfile === profileName) {
      const first = Object.keys(file.profiles)[0];
      if (first) file.currentProfile = first;
    }
    saveConfigFile(file);
  }
  return true;
}

export function loadAllProfiles(): Record<string, Config> {
  try {
    const file = loadConfigFile();
    return file.profiles;
  } catch {
    return {};
  }
}

export function setCurrentProfile(name: string): void {
  const file = loadConfigFile();
  if (!file.profiles[name]) {
    const available = Object.keys(file.profiles).join(", ");
    throw new Error(
      `Profile "${name}" not found. Available profiles: ${available}`,
    );
  }
  file.currentProfile = name;
  saveConfigFile(file);
}

/**
 * Get the base URL for the Observe API
 */
export function getApiBaseUrl(config: Config): string {
  if (config.apiUrl) {
    return config.apiUrl.replace(/\/v1\/meta$/, "");
  }

  return `https://${config.customerId}.${config.domain}`;
}
