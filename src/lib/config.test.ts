import {
  afterEach,
  beforeEach,
  describe,
  expect,
  test,
} from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import {
  configExists,
  deleteConfig,
  getActiveProfileName,
  getCurrentProfileName,
  listProfiles,
  loadConfig,
  saveConfig,
  setCurrentProfile,
} from "./config";

let tmpDir: string;
let originalHome: string | undefined;
let originalProfile: string | undefined;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "observe-config-test-"));
  originalHome = process.env.HOME;
  originalProfile = process.env.OBSERVE_PROFILE;
  process.env.HOME = tmpDir;
  delete process.env.OBSERVE_PROFILE;
});

afterEach(() => {
  process.env.HOME = originalHome;
  if (originalProfile !== undefined) {
    process.env.OBSERVE_PROFILE = originalProfile;
  } else {
    delete process.env.OBSERVE_PROFILE;
  }
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function writeConfigFile(data: unknown) {
  const configDir = path.join(tmpDir, ".observe");
  fs.mkdirSync(configDir, { recursive: true });
  fs.writeFileSync(
    path.join(configDir, "config.json"),
    JSON.stringify(data, null, 2),
  );
}

function readConfigFile(): unknown {
  const raw = fs.readFileSync(
    path.join(tmpDir, ".observe", "config.json"),
    "utf-8",
  );
  return JSON.parse(raw);
}

describe("migration from flat format", () => {
  test("auto-migrates flat config to profile format on load", () => {
    writeConfigFile({
      customerId: "123",
      domain: "observeinc.com",
      token: "tok-abc",
    });

    const config = loadConfig();

    expect(config.customerId).toBe("123");
    expect(config.domain).toBe("observeinc.com");
    expect(config.token).toBe("tok-abc");

    const onDisk = readConfigFile() as Record<string, unknown>;
    expect(onDisk).toHaveProperty("profiles");
    expect(onDisk).toHaveProperty("currentProfile", "default");
    const profiles = onDisk.profiles as Record<string, unknown>;
    expect(profiles).toHaveProperty("default");
  });

  test("preserves optional fields during migration", () => {
    writeConfigFile({
      customerId: "123",
      domain: "observeinc.com",
      token: "tok-abc",
      tokenId: "tid-1",
      apiUrl: "https://123.observeinc.com/v1/meta",
    });

    const config = loadConfig();

    expect(config.tokenId).toBe("tid-1");
    expect(config.apiUrl).toBe("https://123.observeinc.com/v1/meta");
  });
});

describe("profile-aware loadConfig", () => {
  test("loads the default profile", () => {
    writeConfigFile({
      currentProfile: "default",
      profiles: {
        default: {
          customerId: "111",
          domain: "observeinc.com",
          token: "tok-1",
        },
        staging: {
          customerId: "222",
          domain: "staging.com",
          token: "tok-2",
        },
      },
    });

    const config = loadConfig();
    expect(config.customerId).toBe("111");
  });

  test("loads the profile selected by OBSERVE_PROFILE", () => {
    writeConfigFile({
      currentProfile: "default",
      profiles: {
        default: {
          customerId: "111",
          domain: "observeinc.com",
          token: "tok-1",
        },
        staging: {
          customerId: "222",
          domain: "staging.com",
          token: "tok-2",
        },
      },
    });

    process.env.OBSERVE_PROFILE = "staging";
    const config = loadConfig();
    expect(config.customerId).toBe("222");
  });

  test("throws when the selected profile does not exist", () => {
    writeConfigFile({
      currentProfile: "default",
      profiles: {
        default: {
          customerId: "111",
          domain: "observeinc.com",
          token: "tok-1",
        },
      },
    });

    process.env.OBSERVE_PROFILE = "missing";
    expect(() => loadConfig()).toThrow('Profile "missing" not found');
  });

  test("throws when config file does not exist", () => {
    expect(() => loadConfig()).toThrow("Configuration not found");
  });
});

describe("profile-aware saveConfig", () => {
  test("creates a new config file with the default profile", () => {
    saveConfig({
      customerId: "111",
      domain: "observeinc.com",
      token: "tok-1",
    });

    const onDisk = readConfigFile() as Record<string, unknown>;
    expect(onDisk).toHaveProperty("currentProfile", "default");
    const profiles = onDisk.profiles as Record<string, Record<string, unknown>>;
    expect(profiles.default).toMatchObject({
      customerId: "111",
      domain: "observeinc.com",
      token: "tok-1",
    });
  });

  test("saves to a named profile without disturbing others", () => {
    writeConfigFile({
      currentProfile: "default",
      profiles: {
        default: {
          customerId: "111",
          domain: "observeinc.com",
          token: "tok-1",
        },
      },
    });

    process.env.OBSERVE_PROFILE = "staging";
    saveConfig({
      customerId: "222",
      domain: "staging.com",
      token: "tok-2",
    });

    const onDisk = readConfigFile() as Record<string, unknown>;
    const profiles = onDisk.profiles as Record<string, Record<string, unknown>>;
    expect(profiles.default).toMatchObject({ customerId: "111" });
    expect(profiles.staging).toMatchObject({ customerId: "222" });
  });
});

describe("profile-aware deleteConfig", () => {
  test("deletes the active profile and preserves others", () => {
    writeConfigFile({
      currentProfile: "default",
      profiles: {
        default: {
          customerId: "111",
          domain: "observeinc.com",
          token: "tok-1",
        },
        staging: {
          customerId: "222",
          domain: "staging.com",
          token: "tok-2",
        },
      },
    });

    const deleted = deleteConfig();
    expect(deleted).toBe(true);

    const onDisk = readConfigFile() as Record<string, unknown>;
    const profiles = onDisk.profiles as Record<string, unknown>;
    expect(profiles).not.toHaveProperty("default");
    expect(profiles).toHaveProperty("staging");
  });

  test("deletes the file when the last profile is removed", () => {
    writeConfigFile({
      currentProfile: "default",
      profiles: {
        default: {
          customerId: "111",
          domain: "observeinc.com",
          token: "tok-1",
        },
      },
    });

    const deleted = deleteConfig();
    expect(deleted).toBe(true);

    const configPath = path.join(tmpDir, ".observe", "config.json");
    expect(fs.existsSync(configPath)).toBe(false);
  });

  test("returns false when the profile does not exist", () => {
    writeConfigFile({
      currentProfile: "default",
      profiles: {
        default: {
          customerId: "111",
          domain: "observeinc.com",
          token: "tok-1",
        },
      },
    });

    process.env.OBSERVE_PROFILE = "missing";
    expect(deleteConfig()).toBe(false);
  });
});

describe("configExists", () => {
  test("returns true when the active profile exists", () => {
    writeConfigFile({
      currentProfile: "default",
      profiles: {
        default: {
          customerId: "111",
          domain: "observeinc.com",
          token: "tok-1",
        },
      },
    });

    expect(configExists()).toBe(true);
  });

  test("returns false when the active profile is missing", () => {
    writeConfigFile({
      currentProfile: "default",
      profiles: {
        staging: {
          customerId: "222",
          domain: "staging.com",
          token: "tok-2",
        },
      },
    });

    expect(configExists()).toBe(false);
  });

  test("returns false when config file does not exist", () => {
    expect(configExists()).toBe(false);
  });
});

describe("listProfiles", () => {
  test("returns all profile names", () => {
    writeConfigFile({
      currentProfile: "default",
      profiles: {
        default: {
          customerId: "111",
          domain: "observeinc.com",
          token: "tok-1",
        },
        staging: {
          customerId: "222",
          domain: "staging.com",
          token: "tok-2",
        },
      },
    });

    expect(listProfiles()).toEqual(["default", "staging"]);
  });

  test("returns empty array when no config file", () => {
    expect(listProfiles()).toEqual([]);
  });
});

describe("setCurrentProfile", () => {
  test("updates the current profile", () => {
    writeConfigFile({
      currentProfile: "default",
      profiles: {
        default: {
          customerId: "111",
          domain: "observeinc.com",
          token: "tok-1",
        },
        staging: {
          customerId: "222",
          domain: "staging.com",
          token: "tok-2",
        },
      },
    });

    setCurrentProfile("staging");

    const onDisk = readConfigFile() as Record<string, unknown>;
    expect(onDisk).toHaveProperty("currentProfile", "staging");
  });

  test("throws when profile does not exist", () => {
    writeConfigFile({
      currentProfile: "default",
      profiles: {
        default: {
          customerId: "111",
          domain: "observeinc.com",
          token: "tok-1",
        },
      },
    });

    expect(() => setCurrentProfile("missing")).toThrow(
      'Profile "missing" not found',
    );
  });
});

describe("getActiveProfileName", () => {
  test("returns OBSERVE_PROFILE when set", () => {
    process.env.OBSERVE_PROFILE = "staging";
    expect(getActiveProfileName()).toBe("staging");
  });

  test("returns currentProfile from config file", () => {
    writeConfigFile({
      currentProfile: "production",
      profiles: {
        production: {
          customerId: "333",
          domain: "prod.com",
          token: "tok-3",
        },
      },
    });

    expect(getActiveProfileName()).toBe("production");
  });

  test("falls back to 'default' when nothing is configured", () => {
    expect(getActiveProfileName()).toBe("default");
  });
});

describe("getCurrentProfileName", () => {
  test("returns currentProfile from config file", () => {
    writeConfigFile({
      currentProfile: "staging",
      profiles: {
        staging: {
          customerId: "222",
          domain: "staging.com",
          token: "tok-2",
        },
      },
    });

    expect(getCurrentProfileName()).toBe("staging");
  });

  test("falls back to 'default' when no config file", () => {
    expect(getCurrentProfileName()).toBe("default");
  });
});
