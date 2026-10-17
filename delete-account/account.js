// This page never stores keys, includes analytics, or puts credentials in URLs.
const api = "https://rainsong-friends-api.onrender.com/v1/me";
const form = document.querySelector("#account-form");
const recovery = document.querySelector("#recovery");
const confirm = document.querySelector("#confirm");
const status = document.querySelector("#status");
let token = "";
let busy = false;
async function request(method) {
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), 12000);
  try {
    const response = await fetch(api, { method, headers: { Authorization: `Bearer ${token}` }, signal: abort.signal, credentials: "omit", redirect: "error", cache: "no-store", referrerPolicy: "no-referrer" });
    if (!response.ok) {
      const error = new Error(response.status === 401 ? "That key is not valid, or this account has already been deleted." : "Could not reach your account. Please try again.");
      error.status = response.status; throw error;
    }
    return await response.json();
  } finally { clearTimeout(timer); }
}
function lock(value) { busy = value; document.querySelectorAll("button").forEach(b => { b.disabled = value; }); }
function clear() { token = ""; recovery.value = ""; confirm.hidden = true; form.hidden = false; }
form.addEventListener("submit", async event => {
  event.preventDefault(); if (busy) return;
  const match = /^RAINSONG-FRIENDS-1:([A-Za-z0-9_-]{32,160})$/.exec(recovery.value.trim());
  if (!match) { status.textContent = "Paste the complete Friends recovery key."; return; }
  token = match[1]; lock(true); status.textContent = "Finding your account…";
  try {
    const data = await request("GET");
    if (!data.player?.name) throw new Error("Could not read your account. Please try again.");
    document.querySelector("#account-name").textContent = `Delete the Friends account for ${data.player.name}?`;
    form.hidden = true; recovery.value = ""; confirm.hidden = false; status.textContent = "";
    document.querySelector("#delete").focus();
  } catch (error) { token = ""; status.textContent = error.name === "AbortError" ? "The connection timed out. Please try again." : error.message; }
  finally { lock(false); }
});
document.querySelector("#cancel").addEventListener("click", () => { if (busy) return; clear(); status.textContent = "Your account has been kept."; recovery.focus(); });
document.querySelector("#delete").addEventListener("click", async () => {
  if (busy || !token) return;
  lock(true); status.textContent = "Deleting your Friends account…";
  try {
    const result = await request("DELETE");
    if (result.deleted !== true) throw new Error("Deletion was not confirmed. Please try again.");
    clear(); form.hidden = true; status.textContent = "Your Friends account has been deleted. Your local solo progress and store purchases are unchanged.";
  } catch (error) {
    if (error.status === 401) {
      clear(); form.hidden = true;
      status.textContent = "This key no longer has access. If you retried after a connection failure, deletion may already be complete. Contact us below if you need confirmation.";
    } else status.textContent = error.name === "AbortError" ? "The connection timed out. You can retry safely." : error.message;
  }
  finally { lock(false); }
});
window.addEventListener("pagehide", clear);
