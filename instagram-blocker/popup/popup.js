import { daysRemaining, timeRemainingParts } from "../lib/lock.js";

const subtitle = document.getElementById("subtitle");
const statusEl = document.getElementById("status");
const setupView = document.getElementById("setup-view");
const lockedView = document.getElementById("locked-view");
const idleView = document.getElementById("idle-view");
const countdown = document.getElementById("countdown");
const setupForm = document.getElementById("setup-form");
const unlockForm = document.getElementById("unlock-form");
const showSetupButton = document.getElementById("show-setup");

/**
 * @param {string} text
 * @param {"ok"|"error"|""} [kind]
 */
function setStatus(text, kind = "") {
  statusEl.textContent = text;
  statusEl.classList.remove("ok", "error");
  if (kind) {
    statusEl.classList.add(kind);
  }
}

/**
 * @param {"setup"|"locked"|"idle"} view
 * @param {string} subtitleText
 */
function showView(view, subtitleText) {
  setupView.hidden = view !== "setup";
  lockedView.hidden = view !== "locked";
  idleView.hidden = view !== "idle";
  subtitle.textContent = subtitleText;
}

/**
 * @param {number} lockEndsAt
 * @param {number} now
 */
function renderCountdown(lockEndsAt, now) {
  const days = daysRemaining(lockEndsAt, now);
  const parts = timeRemainingParts(lockEndsAt, now);
  const endLabel = new Date(lockEndsAt).toLocaleString();
  countdown.textContent =
    days === 1
      ? `1 day left · unlocks ${endLabel}`
      : `${days} days left · unlocks ${endLabel}`;
  if (days === 0) {
    countdown.textContent = `Less than a day left (${parts.hours}h ${parts.minutes}m) · unlocks ${endLabel}`;
  }
}

async function refresh() {
  const response = await chrome.runtime.sendMessage({ type: "getStatus" });
  if (!response?.ok) {
    showView("idle", "Unable to read lock status");
    setStatus(response?.error || "Something went wrong.", "error");
    return;
  }

  if (response.active && typeof response.lockEndsAt === "number") {
    showView("locked", "Hard lock is active");
    renderCountdown(response.lockEndsAt, response.now || Date.now());
    setStatus("");
    return;
  }

  showView("setup", "No active lock");
  setStatus("");
}

setupForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setStatus("Starting lock…");
  const password = /** @type {HTMLInputElement} */ (
    document.getElementById("setup-password")
  ).value;
  const confirm = /** @type {HTMLInputElement} */ (
    document.getElementById("setup-confirm")
  ).value;
  const response = await chrome.runtime.sendMessage({
    type: "startLock",
    password,
    confirm,
  });
  if (!response?.ok) {
    setStatus(response?.error || "Could not start lock.", "error");
    return;
  }
  setStatus("Lock started. Instagram is blocked.", "ok");
  await refresh();
});

unlockForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setStatus("Checking password…");
  const password = /** @type {HTMLInputElement} */ (
    document.getElementById("unlock-password")
  ).value;
  const response = await chrome.runtime.sendMessage({
    type: "unlock",
    password,
  });
  if (!response?.ok) {
    setStatus(response?.error || "Could not unlock.", "error");
    return;
  }
  setStatus("Lock ended. Instagram is accessible again.", "ok");
  showView("idle", "Lock ended");
  idleView.hidden = false;
  setupView.hidden = true;
  lockedView.hidden = true;
});

showSetupButton.addEventListener("click", () => {
  showView("setup", "Set up a new lock");
  setStatus("");
});

void refresh();
