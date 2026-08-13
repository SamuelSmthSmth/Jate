  import { createRoot } from "react-dom/client";
  import { BrowserRouter } from "react-router";
  import App from "./app/App.tsx";
  import "./styles/index.css";
  import { ThemeSettingsProvider } from "./hooks/useThemeSettings";

  createRoot(document.getElementById("root")!).render(
    <BrowserRouter>
      <ThemeSettingsProvider>
        <App />
      </ThemeSettingsProvider>
    </BrowserRouter>
  );
