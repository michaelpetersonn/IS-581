import { daysRemaining, timeRemainingParts } from "../lib/lock.js";

const message = document.getElementById("message");

async function render() {
  const response = await chrome.runtime.sendMessage({ type: "getStatus" });
  if (!response?.ok) {
    message.textContent = "Could not read lock status.";
    return;
  }

  if (!response.active || typeof response.lockEndsAt !== "number") {
    message.textContent = "This lock has ended. Reload to open Instagram.";
    return;
  }

  const now = response.now || Date.now();
  const days = daysRemaining(response.lockEndsAt, now);
  const parts = timeRemainingParts(response.lockEndsAt, now);
  const endLabel = new Date(response.lockEndsAt).toLocaleString();

  if (days > 1) {
    message.textContent = `${days} days remaining. Unlocks ${endLabel}.`;
    return;
  }
  if (days === 1) {
    message.textContent = `1 day remaining. Unlocks ${endLabel}.`;
    return;
  }
  message.textContent = `${parts.hours}h ${parts.minutes}m remaining. Unlocks ${endLabel}.`;
}

void render();
