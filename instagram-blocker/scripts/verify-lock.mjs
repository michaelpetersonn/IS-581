import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BLOCK_RULE_ID,
  LOCK_DURATION_MS,
  buildBlockRule,
  computeLockEndsAt,
  daysRemaining,
  isLockActive,
  timeRemainingParts,
  validateNewPassword,
} from "../lib/lock.js";
import {
  fromBase64,
  hashPassword,
  randomBytes,
  toBase64,
  verifyPassword,
} from "../lib/crypto.js";

describe("lock helpers", () => {
  it("computes a 30-day end timestamp", () => {
    const now = Date.UTC(2026, 0, 1);
    assert.equal(computeLockEndsAt(now), now + LOCK_DURATION_MS);
    assert.equal(LOCK_DURATION_MS, 30 * 24 * 60 * 60 * 1000);
  });

  it("reports active only before expiry", () => {
    const endsAt = 1_000_000;
    assert.equal(isLockActive({ lockEndsAt: endsAt }, endsAt - 1), true);
    assert.equal(isLockActive({ lockEndsAt: endsAt }, endsAt), false);
    assert.equal(isLockActive({}, 1), false);
  });

  it("rounds days remaining up", () => {
    const endsAt = Date.UTC(2026, 0, 31);
    const almostOneDay = endsAt - (24 * 60 * 60 * 1000 - 1);
    assert.equal(daysRemaining(endsAt, almostOneDay), 1);
    assert.equal(daysRemaining(endsAt, endsAt), 0);
  });

  it("splits remaining time into parts", () => {
    const now = 0;
    const endsAt = (2 * 24 + 3) * 60 * 60 * 1000 + 4 * 60 * 1000;
    assert.deepEqual(timeRemainingParts(endsAt, now), {
      days: 2,
      hours: 3,
      minutes: 4,
    });
  });

  it("validates new passwords", () => {
    assert.equal(
      validateNewPassword("short", "short"),
      "Password must be at least 8 characters.",
    );
    assert.equal(
      validateNewPassword("longenough", "different"),
      "Passwords do not match.",
    );
    assert.equal(validateNewPassword("longenough", "longenough"), null);
  });

  it("builds a main-frame redirect rule for Instagram domains", () => {
    const rule = buildBlockRule("/blocked/blocked.html");
    assert.equal(rule.id, BLOCK_RULE_ID);
    assert.equal(rule.action.type, "redirect");
    assert.equal(rule.action.redirect.extensionPath, "/blocked/blocked.html");
    assert.deepEqual(rule.condition.requestDomains, [
      "instagram.com",
      "instagr.am",
    ]);
    assert.deepEqual(rule.condition.resourceTypes, ["main_frame"]);
  });
});

describe("password hashing", () => {
  it("round-trips salt encoding", () => {
    const salt = randomBytes(16);
    assert.equal(salt.byteLength, 16);
    assert.deepEqual(fromBase64(toBase64(salt)), salt);
  });

  it("verifies the correct password and rejects a wrong one", async () => {
    const salt = randomBytes(16);
    const hash = await hashPassword("correct-horse", salt);
    const hashB64 = toBase64(hash);
    const saltB64 = toBase64(salt);
    assert.equal(await verifyPassword("correct-horse", saltB64, hashB64), true);
    assert.equal(
      await verifyPassword("wrong-password", saltB64, hashB64),
      false,
    );
  });
});
