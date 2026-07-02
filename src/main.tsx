import React from "react";
import ReactDOM from "react-dom/client";
import { addCollection } from "@iconify/react";
import logos from "@/data/logosSubset.json";
import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
import "./index.css";
import App from "./App";

// Register only the brand logos we actually use (offline, no network at runtime).
addCollection(logos as Parameters<typeof addCollection>[0]);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
