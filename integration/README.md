# Integration tests

Integration tests run the Observe CLI as a subprocess against a real tenant.

## Running locally

Copy `.env.example` to `.env` and set the `OBSERVE_INTEGRATION_*` variables. Integration tests load `.env` automatically — no need to export variables in your shell.

```bash
bun run test:integration
```

| Variable                        | Required | Description                           |
| ------------------------------- | -------- | ------------------------------------- |
| `OBSERVE_INTEGRATION_CUSTOMER`  | yes      | Observe customer ID                   |
| `OBSERVE_INTEGRATION_DOMAIN`    | yes      | Tenant domain (e.g. `observeinc.com`) |
| `OBSERVE_INTEGRATION_API_TOKEN` | yes      | API token for the customer            |

The CLI reaches the API at `https://{customerId}.{domain}`. Include a port in the domain when your tenant uses a non-standard HTTPS port (e.g. `observeinc.com:8443`).

Tests fail at startup when required variables are missing.

## Writing tests

Integration tests must run against **any** tenant with valid credentials.

Some operations are safe on every functional tenant without creating resources:

- **Datasets** — every tenant has at least a System dataset, so tests may list datasets or query one.
- **Auth status** — validates credentials from env, not tenant inventory.

For other resource types (monitors, alerts, ingest tokens, etc.), either **create the resource in the test** or use **`testCiOnly`** when CI has known fixtures. Do not assume arbitrary tenant inventory exists.

`testCiOnly` (from `fixture.ts`) runs only when `CI=true` and is skipped locally:

```typescript
testCiOnly("view pre-configured monitor", async () => {
  // depends on OBSERVE_INTEGRATION_MONITOR_ID or similar CI env
});
```

File names like `smoke.test.ts` are for human organization only.

## Resource ownership

Mutating tests must follow the create → assert → delete lifecycle:

1. Generate a unique prefix with `testPrefix()` (e.g. `cli-a1b2c3d4`).
2. Create resources using that prefix in the name.
3. Assert only on resources this test created (by name or ID in list/view output).
4. Delete those resources in `finally`.

**Do not:**

- Assert list sizes or global tenant state (`expect(items.length).toBe(5)`).
- Assert that pre-existing resources have specific values.
- Delete or modify resources you did not create.

Other tests are expected not to touch resources they did not create.

## Naming

Use `testPrefix()` for every resource name:

```typescript
const prefix = testPrefix();
const name = `${prefix}-ingest-token`;
```

Prefix pattern: `cli-<8 hex chars>`. A future sweeper can match `^cli-` to clean up orphans.

## Assertions

`parseJsonOutput` throws when the CLI exits non-zero, so a successful parse means the command succeeded.

```typescript
// Good — assert on a resource this test created
const prefix = testPrefix();
const result =
  await fixture.runCli`observe ingest-token create --name ${prefix}-token`;
const tokens = parseJsonOutput(result) as Token[];
expect(tokens.some((t) => t.name === `${prefix}-token`)).toBe(true);

// Good — validate response shape; datasets are guaranteed on any functional tenant
expect(Array.isArray(datasets)).toBe(true);
expect(datasets.length).toBeGreaterThan(0);

// Good — empty list is valid for resource types not present in every tenant
expect(Array.isArray(metrics)).toBe(true);

// Bad — depends on tenant inventory
expect(monitors.length).toBeGreaterThan(0);
expect(monitors[0].label).toBe("Production alert");
```

## Fixture lifecycle

Use `withIntegrationFixture` so each test gets an isolated temp `$HOME/.observe/config.json`. This is required for parallel execution — do not share a module-level fixture variable across concurrent tests.

Pass commands to `fixture.runCli` as a tagged template literal. Write shell commands the way you would in a terminal, including `\` line continuations for multiline (Bun Shell reads the template's raw segments). Every command must start with `observe`; the fixture strips that prefix and runs `bun src/bin.ts …` via [Bun Shell](https://bun.sh/docs/runtime/shell). A missing or malformed command throws `InvalidCliCommandError` (a test authoring mistake, not a CLI failure).

```typescript
test("example", async () => {
  await withIntegrationFixture(tenant, async (fixture) => {
    const result = await fixture.runCli`
      observe dataset list \
        --format json \
        --limit 5
    `;
    // ...
  });
});
```

Single-line commands can go on one row inside the template:

```typescript
await fixture.runCli`
  observe auth status --json
`;
```

For dynamic arguments, interpolate into the template (quote values that may contain spaces):

```typescript
await fixture.runCli`
  observe query \
    --input ${datasetId} \
    --pipeline "limit 1" \
    --format json \
    --interval 24h
`;
```

## Parallelism

Tests are designed to run in parallel against a shared tenant. Unique prefixes and the ownership rules above make that safe. `bun run test:integration` runs with `--concurrent --max-concurrency 5`. Use `test.serial` only when a test genuinely cannot run alongside others (rare).
