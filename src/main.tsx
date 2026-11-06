import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import App from "./App.tsx"
import "./index.css"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Installation uses the browser's own UI; no in-app download button or prompt.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" })
      .catch((error: unknown) => console.warn("Offline support could not be registered", error))
  })
}
