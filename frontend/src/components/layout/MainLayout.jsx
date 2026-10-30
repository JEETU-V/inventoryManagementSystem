import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import { useAppData } from "../../contexts/useAppData";

function MainLayout({ children }) {
  const { apiError } = useAppData();

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <Navbar />
        <main className="app-content">
          {apiError && (
            <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {apiError}
            </p>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}

export default MainLayout;