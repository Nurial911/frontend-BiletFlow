import { Outlet } from "react-router-dom";
import { Header } from "./Header";
import { CategoryNav } from "./CategoryNav";
import { LoginModal } from "../auth/LoginModal";
import { EmailVerificationNotice } from "../../pages/AuthPages";
import { LanguageProvider } from "../../i18n/LanguageContext";
import { useAuth } from "../../auth/AuthContext";
import { RequestError } from "../events/EventExtras";

// The frame shared by every page. <Outlet /> is where the current page appears.
export function PageLayout() {
  const { sessionError } = useAuth();
  return (
    <LanguageProvider><div className="min-h-screen bg-white text-black">
      <Header />
      <CategoryNav />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <RequestError error={sessionError} />
        <EmailVerificationNotice />
        <Outlet />
      </main>
      <LoginModal />
    </div></LanguageProvider>
  );
}
