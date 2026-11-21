import { Navigate, Route, Routes } from "react-router-dom";
import { PageLayout } from "./components/layout/PageLayout";
import HomePage from "./pages/HomePage";
import EventPage from "./pages/EventPage";
import OrderConfirmationPage from "./pages/OrderConfirmationPage";
import { AccountSettingsPage, EventCheckInPage, MyAccountPage, PlatformAdminPage } from "./pages/AccountPages";
import { AdminEventSalesPage, OrganizerEventStaffPage, OrganizerSalesPage } from "./pages/OrganizerInsightsPage";
import { RoleGuard } from "./pages/RoleGuard";
import NotFoundPage from "./pages/NotFoundPage";
import { AuthActionPage } from "./pages/AuthPages";
import NotificationsPage from "./pages/NotificationsPage";
import EventHistoryPage from "./pages/EventHistoryPage";
import { NewSupportCasePage, SupportCasePage, SupportListPage } from "./pages/SupportPages";
import { ActivationPage, AdminActivationsPage, AdminVerificationPage, CampaignsPage } from "./pages/CommercePages";
import {
  CreateOrganizerEventPage,
  EditOrganizerEventPage,
  ManageOrganizerEventsPage,
  MyOrganizerEventsPage,
  OrganizerDashboardLayout,
  OrganizerGuard,
  OrganizerTicketsPage,
} from "./pages/OrganizerPage";

// Which page shows for which address.
export default function App() {
  return (
    <Routes>
      <Route element={<PageLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/events/:id" element={<EventPage />} />
        <Route path="/orders/:orderId" element={<OrderConfirmationPage />} />
        <Route path="/orders/:orderId/payment-result" element={<OrderConfirmationPage paymentResult />} />
        <Route path="/forgot-password" element={<AuthActionPage key="forgot" mode="forgot" />} />
        <Route path="/reset-password" element={<AuthActionPage key="reset" mode="reset" />} />
        <Route path="/verify-email" element={<AuthActionPage key="verify" mode="verify" />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/support" element={<SupportListPage />} />
        <Route path="/support/new" element={<NewSupportCasePage />} />
        <Route path="/support/:caseId" element={<SupportCasePage />} />
        <Route path="/account" element={<MyAccountPage />} />
        <Route path="/account/settings" element={<AccountSettingsPage />} />
        <Route path="/staff" element={<RoleGuard roles={["EVENT_ADMIN", "EVENT_STAFF", "CHECK_IN_STAFF", "ORGANIZER", "PLATFORM_ADMIN", "ADMIN"]}><EventCheckInPage /></RoleGuard>} />
        <Route path="/admin/users" element={<RoleGuard roles={["PLATFORM_ADMIN", "ADMIN"]}><PlatformAdminPage /></RoleGuard>} />
        <Route path="/admin/dashboard" element={<RoleGuard roles={["PLATFORM_ADMIN", "ADMIN"]}><OrganizerDashboardLayout /></RoleGuard>}>
          <Route index element={<Navigate to="events" replace />} />
          <Route path="events" element={<MyOrganizerEventsPage />} />
          <Route path="events/:eventId/staff" element={<OrganizerEventStaffPage />} />
          <Route path="events/:eventId/history" element={<EventHistoryPage />} />
          <Route path="activations" element={<AdminActivationsPage />} />
          <Route path="verification" element={<AdminVerificationPage />} />
          <Route path="support" element={<SupportListPage escalatedOnly />} />
          <Route path="manage" element={<ManageOrganizerEventsPage />} />
          <Route path="sales" element={<AdminEventSalesPage />} />
        </Route>
        <Route path="/organizer" element={<OrganizerGuard />}>
          <Route element={<OrganizerDashboardLayout />}>
            <Route index element={<Navigate to="events" replace />} />
            <Route path="events" element={<MyOrganizerEventsPage />} />
            <Route path="events/:eventId/tickets" element={<OrganizerTicketsPage />} />
            <Route path="events/:eventId/edit" element={<EditOrganizerEventPage />} />
            <Route path="events/:eventId/staff" element={<OrganizerEventStaffPage />} />
            <Route path="events/:eventId/campaigns" element={<CampaignsPage />} />
            <Route path="events/:eventId/history" element={<EventHistoryPage />} />
            <Route path="events/:eventId/activation" element={<ActivationPage />} />
            <Route path="create" element={<CreateOrganizerEventPage />} />
            <Route path="manage" element={<ManageOrganizerEventsPage />} />
            <Route path="sales" element={<OrganizerSalesPage />} />
          </Route>
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
