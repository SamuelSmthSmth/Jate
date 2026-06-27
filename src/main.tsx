
  import { createRoot } from "react-dom/client";
  import App from "./app/App.tsx";
  import "./styles/index.css";
  import { ThemeSettingsProvider } from "./hooks/useThemeSettings";

  createRoot(document.getElementById("root")!).render(
    <ThemeSettingsProvider>
      <App />
    </ThemeSettingsProvider>
  );
  