import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { PageLayout } from "./components/layout/PageLayout";
import HomePage from "./pages/HomePage";
import EventPage from "./pages/EventPage";
import OrderConfirmationPage from "./pages/OrderConfirmationPage";
import { RoleGuard } from "./pages/RoleGuard";
import NotFoundPage from "./pages/NotFoundPage";
import { AuthActionPage } from "./pages/AuthPages";
import NotificationsPage from "./pages/NotificationsPage";
import EventHistoryPage from "./pages/EventHistoryPage";
import { NewSupportCasePage, SupportCasePage, SupportListPage } from "./pages/SupportPages";

const AdminOverviewPage = lazy(() => import("./pages/PlatformPages").then(m => ({ default: m.AdminOverviewPage })));
const AdminSearchPage = lazy(() => import("./pages/PlatformPages").then(m => ({ default: m.AdminSearchPage })));
const AdminSettingsPage = lazy(() => import("./pages/PlatformPages").then(m => ({ default: m.AdminSettingsPage })));
const AdminReportsPage = lazy(() => import("./pages/PlatformPages").then(m => ({ default: m.AdminReportsPage })));
const AdminReportPage = lazy(() => import("./pages/PlatformPages").then(m => ({ default: m.AdminReportPage })));
const PayoutsPage = lazy(() => import("./pages/PlatformPages").then(m => ({ default: m.PayoutsPage })));
const AdminPayoutPage = lazy(() => import("./pages/PlatformPages").then(m => ({ default: m.AdminPayoutPage })));
const EventPayoutPage = lazy(() => import("./pages/PlatformPages").then(m => ({ default: m.EventPayoutPage })));
const SeatingSetupPage = lazy(() => import("./pages/SeatingSetupPage"));
const VenueLayoutsPage = lazy(() => import("./pages/SeatingSetupPage").then(m => ({ default: m.VenueLayoutsPage })));
const AccountSettingsPage = lazy(() => import("./pages/AccountPages").then(m => ({ default: m.AccountSettingsPage })));
const EventCheckInPage = lazy(() => import("./pages/AccountPages").then(m => ({ default: m.EventCheckInPage })));
const MyAccountPage = lazy(() => import("./pages/AccountPages").then(m => ({ default: m.MyAccountPage })));
const PlatformAdminPage = lazy(() => import("./pages/AccountPages").then(m => ({ default: m.PlatformAdminPage })));
const AdminEventSalesPage = lazy(() => import("./pages/OrganizerInsightsPage").then(m => ({ default: m.AdminEventSalesPage })));
const OrganizerEventStaffPage = lazy(() => import("./pages/OrganizerInsightsPage").then(m => ({ default: m.OrganizerEventStaffPage })));
const OrganizerSalesPage = lazy(() => import("./pages/OrganizerInsightsPage").then(m => ({ default: m.OrganizerSalesPage })));
const ActivationPage = lazy(() => import("./pages/CommercePages").then(m => ({ default: m.ActivationPage })));
const AdminActivationsPage = lazy(() => import("./pages/CommercePages").then(m => ({ default: m.AdminActivationsPage })));
const AdminVerificationPage = lazy(() => import("./pages/CommercePages").then(m => ({ default: m.AdminVerificationPage })));
const CampaignsPage = lazy(() => import("./pages/CommercePages").then(m => ({ default: m.CampaignsPage })));
const CreateOrganizerEventPage = lazy(() => import("./pages/OrganizerPage").then(m => ({ default: m.CreateOrganizerEventPage })));
const EditOrganizerEventPage = lazy(() => import("./pages/OrganizerPage").then(m => ({ default: m.EditOrganizerEventPage })));
const ManageOrganizerEventsPage = lazy(() => import("./pages/OrganizerPage").then(m => ({ default: m.ManageOrganizerEventsPage })));
const MyOrganizerEventsPage = lazy(() => import("./pages/OrganizerPage").then(m => ({ default: m.MyOrganizerEventsPage })));
const OrganizerDashboardLayout = lazy(() => import("./pages/OrganizerPage").then(m => ({ default: m.OrganizerDashboardLayout })));
const OrganizerGuard = lazy(() => import("./pages/OrganizerPage").then(m => ({ default: m.OrganizerGuard })));
const OrganizerTicketsPage = lazy(() => import("./pages/OrganizerPage").then(m => ({ default: m.OrganizerTicketsPage })));
// Which page shows for which address.
export default function App() {
  return (
    <Suspense fallback={<div role="status" aria-busy="true" className="p-8">…</div>}><Routes>
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
          <Route index element={<Navigate to="overview" replace />} />
          <Route path="overview" element={<AdminOverviewPage />} />
          <Route path="orders" element={<AdminSearchPage key="orders" resource="orders" />} />
          <Route path="payments" element={<AdminSearchPage key="payments" resource="payments" />} />
          <Route path="refunds" element={<AdminSearchPage key="refunds" resource="refunds" />} />
          <Route path="campaigns" element={<AdminSearchPage key="campaigns" resource="campaigns" />} />
          <Route path="reports" element={<AdminReportsPage />} />
          <Route path="reports/:reportId" element={<AdminReportPage />} />
          <Route path="settings" element={<AdminSettingsPage />} />
          <Route path="venues" element={<VenueLayoutsPage />} />
          <Route path="payouts" element={<PayoutsPage admin />} />
          <Route path="payouts/:payoutId" element={<AdminPayoutPage />} />
          <Route path="events" element={<AdminSearchPage resource="events" />} />
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
            <Route path="payouts" element={<PayoutsPage />} />
            <Route path="events/:eventId/payout" element={<EventPayoutPage />} />
            <Route path="events/:eventId/seating" element={<SeatingSetupPage />} />
            <Route path="create" element={<CreateOrganizerEventPage />} />
            <Route path="manage" element={<ManageOrganizerEventsPage />} />
            <Route path="sales" element={<OrganizerSalesPage />} />
          </Route>
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes></Suspense>
  );
}
