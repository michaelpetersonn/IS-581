/** Lock state helpers. Pure where possible for unit tests. */

export const LOCK_DURATION_MS = 30 * 24 * 60 * 60 * 1000;
export const BLOCK_RULE_ID = 1001;

export const STORAGE_KEYS = {
  lockEndsAt: "lockEndsAt",
  passwordSalt: "passwordSalt",
  passwordHash: "passwordHash",
};

/**
 * @param {number} nowMs
 * @param {number} [durationMs]
 * @returns {number}
 */
export function computeLockEndsAt(nowMs, durationMs = LOCK_DURATION_MS) {
  return nowMs + durationMs;
}

/**
 * @param {{ lockEndsAt?: number|null }} state
 * @param {number} nowMs
 * @returns {boolean}
 */
export function isLockActive(state, nowMs) {
  const endsAt = state?.lockEndsAt;
  return (
    typeof endsAt === "number" && Number.isFinite(endsAt) && endsAt > nowMs
  );
}

/**
 * @param {number} lockEndsAt
 * @param {number} nowMs
 * @returns {number} whole days remaining, rounded up; 0 when expired
 */
export function daysRemaining(lockEndsAt, nowMs) {
  const remainingMs = lockEndsAt - nowMs;
  if (remainingMs <= 0) {
    return 0;
  }
  return Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
}

/**
 * @param {number} lockEndsAt
 * @param {number} nowMs
 * @returns {{ days: number, hours: number, minutes: number }}
 */
export function timeRemainingParts(lockEndsAt, nowMs) {
  const remainingMs = Math.max(0, lockEndsAt - nowMs);
  const totalMinutes = Math.floor(remainingMs / (60 * 1000));
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;
  return { days, hours, minutes };
}

/**
 * @param {string} password
 * @param {string} confirm
 * @returns {string|null} error message or null if valid
 */
export function validateNewPassword(password, confirm) {
  if (typeof password !== "string" || password.length < 8) {
    return "Password must be at least 8 characters.";
  }
  if (password !== confirm) {
    return "Passwords do not match.";
  }
  return null;
}

/**
 * Dynamic DNR redirect rule for Instagram navigations.
 * @param {string} extensionPath e.g. "/blocked/blocked.html"
 */
export function buildBlockRule(extensionPath) {
  return {
    id: BLOCK_RULE_ID,
    priority: 1,
    action: {
      type: "redirect",
      redirect: { extensionPath },
    },
    condition: {
      requestDomains: ["instagram.com", "instagr.am"],
      resourceTypes: ["main_frame"],
    },
  };
}
