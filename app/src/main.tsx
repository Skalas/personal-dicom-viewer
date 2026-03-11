import { StrictMode, Component, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

class ErrorFallback extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  state = { hasError: false, error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <div
          style={{
            padding: 24,
            background: "#1f2937",
            color: "#fca5a5",
            minHeight: "100vh",
            fontFamily: "monospace",
            fontSize: 14,
          }}
        >
          <h2 style={{ margin: "0 0 12px 0" }}>Error loading app</h2>
          <pre style={{ whiteSpace: "pre-wrap", margin: 0 }}>
            {this.state.error.message}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorFallback>
      <App />
    </ErrorFallback>
  </StrictMode>
);
