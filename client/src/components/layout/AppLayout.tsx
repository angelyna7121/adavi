import { Navigation } from "./Navigation";
import { Footer } from "./Footer";
import { HelpWidget } from "@/components/HelpWidget";

interface AppLayoutProps {
  children: React.ReactNode;
  className?: string;
  hideHelp?: boolean;
}

export function AppLayout({ children, className, hideHelp }: AppLayoutProps) {
  return (
    <div
      className={`min-h-screen flex flex-col${className ? " " + className : ""}`}
      style={{ background: "#0D1929", fontFamily: "Calibri, Arial, sans-serif" }}
    >
      <Navigation />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
      {!hideHelp && <HelpWidget />}
    </div>
  );
}

export default AppLayout;
