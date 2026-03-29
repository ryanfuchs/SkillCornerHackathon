import { scan } from "react-scan";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App.tsx";
import { PlaybackProvider } from "@/context/PlaybackContext";

scan({ enabled: false });

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <PlaybackProvider>
        <App />
      </PlaybackProvider>
    </BrowserRouter>
  </StrictMode>,
);
