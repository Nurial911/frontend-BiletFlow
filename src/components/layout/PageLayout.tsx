import { Outlet } from "react-router-dom";
import { Header } from "./Header";
import { CategoryNav } from "./CategoryNav";
import { LoginModal } from "../auth/LoginModal";
import { EmailVerificationNotice } from "../../pages/AuthPages";
import { LanguageProvider } from "../../i18n/LanguageContext";

// The frame shared by every page. <Outlet /> is where the current page appears.
export function PageLayout() {
  return (
    <LanguageProvider><div className="min-h-screen bg-white text-black">
      <Header />
      <CategoryNav />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <EmailVerificationNotice />
        <Outlet />
      </main>
      <LoginModal />
    </div></LanguageProvider>
  );
}
