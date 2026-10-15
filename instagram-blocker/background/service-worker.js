import {
  BLOCK_RULE_ID,
  STORAGE_KEYS,
  buildBlockRule,
  computeLockEndsAt,
  isLockActive,
  validateNewPassword,
} from "../lib/lock.js";
import {
  hashPassword,
  randomBytes,
  toBase64,
  verifyPassword,
} from "../lib/crypto.js";

const BLOCKED_PATH = "/blocked/blocked.html";

/**
 * @returns {Promise<Record<string, unknown>>}
 */
async function readState() {
  return chrome.storage.local.get([
    STORAGE_KEYS.lockEndsAt,
    STORAGE_KEYS.passwordSalt,
    STORAGE_KEYS.passwordHash,
  ]);
}

/**
 * @param {boolean} enabled
 */
async function setBlockRules(enabled) {
  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  const removeRuleIds = existing
    .filter((rule) => rule.id === BLOCK_RULE_ID)
    .map((rule) => rule.id);

  /** @type {{ removeRuleIds: number[], addRules?: object[] }} */
  const update = { removeRuleIds };
  if (enabled) {
    update.addRules = [buildBlockRule(BLOCKED_PATH)];
  }
  await chrome.declarativeNetRequest.updateDynamicRules(update);
}

async function syncRulesFromStorage() {
  const state = await readState();
  const now = Date.now();
  if (isLockActive(state, now)) {
    await setBlockRules(true);
    return;
  }
  await setBlockRules(false);
  if (typeof state.lockEndsAt === "number") {
    await chrome.storage.local.remove([
      STORAGE_KEYS.lockEndsAt,
      STORAGE_KEYS.passwordSalt,
      STORAGE_KEYS.passwordHash,
    ]);
  }
}

/**
 * Close or redirect any open Instagram tabs to the blocked page.
 */
async function bounceOpenInstagramTabs() {
  const tabs = await chrome.tabs.query({
    url: [
      "*://instagram.com/*",
      "*://*.instagram.com/*",
      "*://instagr.am/*",
      "*://*.instagr.am/*",
    ],
  });
  const blockedUrl = chrome.runtime.getURL(BLOCKED_PATH.slice(1));
  await Promise.all(
    tabs.map((tab) => {
      if (typeof tab.id !== "number") {
        return Promise.resolve();
      }
      return chrome.tabs.update(tab.id, { url: blockedUrl });
    }),
  );
}

/**
 * @param {string} password
 * @param {string} confirm
 */
async function startLock(password, confirm) {
  const validationError = validateNewPassword(password, confirm);
  if (validationError) {
    return { ok: false, error: validationError };
  }

  const state = await readState();
  if (isLockActive(state, Date.now())) {
    return { ok: false, error: "A lock is already active." };
  }

  const salt = randomBytes(16);
  const hash = await hashPassword(password, salt);
  const lockEndsAt = computeLockEndsAt(Date.now());

  await chrome.storage.local.set({
    [STORAGE_KEYS.lockEndsAt]: lockEndsAt,
    [STORAGE_KEYS.passwordSalt]: toBase64(salt),
    [STORAGE_KEYS.passwordHash]: toBase64(hash),
  });
  await setBlockRules(true);
  await bounceOpenInstagramTabs();
  return { ok: true, lockEndsAt };
}

/**
 * @param {string} password
 */
async function unlockWithPassword(password) {
  if (typeof password !== "string" || password.length === 0) {
    return { ok: false, error: "Enter your password." };
  }

  const state = await readState();
  const now = Date.now();
  if (!isLockActive(state, now)) {
    await syncRulesFromStorage();
    return { ok: true, alreadyUnlocked: true };
  }

  const salt = state[STORAGE_KEYS.passwordSalt];
  const hash = state[STORAGE_KEYS.passwordHash];
  if (typeof salt !== "string" || typeof hash !== "string") {
    return {
      ok: false,
      error: "Lock data is incomplete. Reinstall the extension.",
    };
  }

  const matches = await verifyPassword(password, salt, hash);
  if (!matches) {
    return { ok: false, error: "Incorrect password." };
  }

  await chrome.storage.local.remove([
    STORAGE_KEYS.lockEndsAt,
    STORAGE_KEYS.passwordSalt,
    STORAGE_KEYS.passwordHash,
  ]);
  await setBlockRules(false);
  return { ok: true };
}

chrome.runtime.onInstalled.addListener(() => {
  void syncRulesFromStorage();
});

chrome.runtime.onStartup.addListener(() => {
  void syncRulesFromStorage();
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") {
    return;
  }
  if (STORAGE_KEYS.lockEndsAt in changes) {
    void syncRulesFromStorage();
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const run = async () => {
    if (!message || typeof message !== "object") {
      return { ok: false, error: "Invalid message." };
    }
    if (message.type === "getStatus") {
      const state = await readState();
      const now = Date.now();
      const active = isLockActive(state, now);
      if (!active && typeof state.lockEndsAt === "number") {
        await syncRulesFromStorage();
      }
      return {
        ok: true,
        active,
        lockEndsAt: active ? state.lockEndsAt : null,
        now,
      };
    }
    if (message.type === "startLock") {
      return startLock(message.password, message.confirm);
    }
    if (message.type === "unlock") {
      return unlockWithPassword(message.password);
    }
    return { ok: false, error: "Unknown message type." };
  };

  void run().then(sendResponse);
  return true;
});

void syncRulesFromStorage();
