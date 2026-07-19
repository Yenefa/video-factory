import React from "react";
import ReactDOM from "react-dom/client";
import "@fontsource-variable/instrument-sans";
import "@fontsource/instrument-serif";
import "./styles/index.css";
import App from "./App";
import { useAppStore } from "./store/useAppStore";

// --- TEMP DEBUG: surface JS errors visibly (vanilla, works even if React
// crashes) to diagnose the non-interactive UI. Remove once resolved. ---
function __showDebugError(msg: string) {
  let el = document.getElementById("__debug_err") as HTMLDivElement | null;
  if (!el) {
    el = document.createElement("div");
    el.id = "__debug_err";
    el.style.cssText =
      "position:fixed;left:0;right:0;bottom:0;max-height:45vh;overflow:auto;z-index:99999;background:#7f1d1d;color:#fff;font:12px/1.5 ui-monospace,monospace;padding:10px 12px;white-space:pre-wrap;border-top:2px solid #fca5a5";
    document.body.appendChild(el);
  }
  el.textContent += msg + "\n";
}
window.addEventListener("error", (e) => {
  __showDebugError("[error] " + e.message + "  @  " + (e.filename || "?") + ":" + (e.lineno || "?"));
});
window.addEventListener("unhandledrejection", (e) => {
  const r = e.reason;
  __showDebugError("[promise] " + (r && r.message ? r.message : String(r)));
});
// --- END TEMP DEBUG ---

// Hydrate persisted state once at startup. Fire and forget - the store
// handles any errors internally and sets a `hydrated` flag the App reads.
// Do NOT await: render must not be blocked on hydration.
void useAppStore.getState().hydrate();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
