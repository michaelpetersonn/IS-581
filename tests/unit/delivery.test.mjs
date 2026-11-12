/**
 * Unit tests for the delivery scripts: deploy guards and the deployed version document.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { deployBlockers, TARGETS } from "../../proxy/scripts/deploy.mjs";
import { versionDocument } from "../../scripts/write-version.mjs";

const SHA = "f2eb2a8931512f26ba97130d93497507bece1fef";
const clean = { status: "", branch: "main", head: SHA, remoteHead: SHA };

test("production deploys only a clean, up-to-date main", () => {
  assert.deepEqual(deployBlockers({ ...clean, env: "production" }), []);
  assert.match(
    deployBlockers({ ...clean, env: "production", status: " M worker.js" })[0],
    /uncommitted changes/,
  );
  assert.match(
    deployBlockers({ ...clean, env: "production", branch: "feat/x" })[0],
    /run from main \(you are on feat\/x\)/,
  );
  assert.match(
    deployBlockers({ ...clean, env: "production", remoteHead: "abc" })[0],
    /does not match origin\/main/,
  );
  assert.match(
    deployBlockers({ ...clean, env: "production", remoteHead: null })[0],
    /does not match origin\/main/,
  );
});

test("staging allows feature branches but not uncommitted changes", () => {
  assert.deepEqual(
    deployBlockers({
      ...clean,
      env: "staging",
      branch: "feat/x",
      remoteHead: null,
    }),
    [],
  );
  assert.equal(
    deployBlockers({ ...clean, env: "staging", status: "?? new.js" }).length,
    1,
  );
  assert.match(
    deployBlockers({ ...clean, env: "prod" })[0],
    /Unknown environment/,
  );
  assert.notEqual(TARGETS.staging.url, TARGETS.production.url);
  assert.deepEqual(TARGETS.staging.wranglerArgs, ["--env", "staging"]);
});

test("versionDocument records the commit, extension version, and deploy run", () => {
  assert.deepEqual(
    versionDocument({
      commit: SHA,
      extensionVersion: "0.1.4",
      builtAt: "2026-11-12T17:00:00.000Z",
      runUrl: "https://github.com/o/r/actions/runs/1",
    }),
    {
      commit: SHA,
      shortCommit: "f2eb2a8",
      extensionVersion: "0.1.4",
      builtAt: "2026-11-12T17:00:00.000Z",
      deployRun: "https://github.com/o/r/actions/runs/1",
    },
  );
  assert.equal(
    "deployRun" in
      versionDocument({ commit: SHA, extensionVersion: "0.1.4", builtAt: "x" }),
    false,
  );
  assert.throws(
    () =>
      versionDocument({ commit: "main", extensionVersion: "0", builtAt: "x" }),
    /Not a commit SHA/,
  );
});
