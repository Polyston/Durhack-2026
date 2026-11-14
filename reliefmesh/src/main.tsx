import "./polyfills";
import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { PhoneApp } from "./phone/App";
import { SimDashboard } from "./dashboard/SimDashboard";
import "@fontsource-variable/archivo/wdth.css";
import "./styles.css";

// "#/sim" = city simulation dashboard (laptop), anything else = phone app.
function Root() {
  const [hash, setHash] = useState(location.hash);
  useEffect(() => {
    const on = () => setHash(location.hash);
    addEventListener("hashchange", on);
    return () => removeEventListener("hashchange", on);
  }, []);
  return hash.startsWith("#/sim") ? <SimDashboard /> : <PhoneApp />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
