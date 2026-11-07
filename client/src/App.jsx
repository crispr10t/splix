import { Navigate, Route, Routes } from "react-router-dom";
import { AppHeader } from "./components/AppHeader";
import { EditPage } from "./pages/EditPage";
import { LandingPage } from "./pages/LandingPage";
import { ViewPage } from "./pages/ViewPage";

export default function App() {
  return (
    <div id="app-canvas" className="min-h-screen text-ink-900 bg-[hsl(var(--paper))]">
      <AppHeader /> {/*top header */}
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/edit/:id" element={<EditPage />} />
        <Route path="/view/:id" element={<ViewPage />} />
        <Route path="*" element={<Navigate to="/" replace />} /> {/*unknown routes  */}
      </Routes>
    </div>
  );
}
