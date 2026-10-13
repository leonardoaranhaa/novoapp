import { createRoot } from "react-dom/client";
import "@fontsource-variable/fraunces/opsz.css";
import "@fontsource-variable/fraunces/opsz-italic.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "../src/styles.css";
import "./mobile.css";
import { LatenteApp } from "@/components/latente/LatenteApp";

const root = document.getElementById("root");
if (!root) throw new Error("Elemento #root ausente em mobile/index.html");

createRoot(root).render(<LatenteApp />);
