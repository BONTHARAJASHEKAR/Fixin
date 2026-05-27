import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import AdminLayout from "./components/AdminLayout";

import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import AuthCallback from "./pages/AuthCallback";
import Pricing from "./pages/Pricing";
import Dashboard from "./pages/Dashboard";
import ResumeStudio from "./pages/ResumeStudio";
import ATSEngine from "./pages/ATSEngine";
import JobDiscovery from "./pages/JobDiscovery";
import InterviewPrep from "./pages/InterviewPrep";
import CareerIntel from "./pages/CareerIntel";
import AppTracker from "./pages/AppTracker";
import LinkedInOptimizer from "./pages/LinkedInOptimizer";
import Settings from "./pages/Settings";

import AdminLogin from "./pages/admin/AdminLogin";
import AdminOverview from "./pages/admin/AdminOverview";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminRevenue from "./pages/admin/AdminRevenue";
import {
  AdminSubscriptions, AdminATSAnalytics, AdminTraffic, AdminActivity, AdminSystem, AdminNotifications,
} from "./pages/admin/AdminMisc";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminReviews from "./pages/admin/AdminReviews";
import AdminContent from "./pages/admin/AdminContent";
import AdminConversion from "./pages/admin/AdminConversion";

function AppRouter() {
  const location = useLocation();
  // Process Emergent OAuth callback synchronously
  if (location.hash?.includes("session_id=")) {
    return <AuthCallback />;
  }
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/pricing" element={<Pricing />} />

      {/* User app */}
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/resume" element={<ResumeStudio />} />
        <Route path="/ats" element={<ATSEngine />} />
        <Route path="/jobs" element={<JobDiscovery />} />
        <Route path="/interview" element={<InterviewPrep />} />
        <Route path="/career" element={<CareerIntel />} />
        <Route path="/tracker" element={<AppTracker />} />
        <Route path="/linkedin" element={<LinkedInOptimizer />} />
        <Route path="/settings" element={<Settings />} />
      </Route>

      {/* Admin */}
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route element={<ProtectedRoute adminOnly><AdminLayout /></ProtectedRoute>}>
        <Route path="/admin" element={<Navigate to="/admin/overview" replace />} />
        <Route path="/admin/overview" element={<AdminOverview />} />
        <Route path="/admin/conversion" element={<AdminConversion />} />
        <Route path="/admin/users" element={<AdminUsers />} />
        <Route path="/admin/revenue" element={<AdminRevenue />} />
        <Route path="/admin/subscriptions" element={<AdminSubscriptions />} />
        <Route path="/admin/ats" element={<AdminATSAnalytics />} />
        <Route path="/admin/traffic" element={<AdminTraffic />} />
        <Route path="/admin/activity" element={<AdminActivity />} />
        <Route path="/admin/system" element={<AdminSystem />} />
        <Route path="/admin/manage" element={<AdminUsers />} />
        <Route path="/admin/settings" element={<AdminSettings />} />
        <Route path="/admin/reviews" element={<AdminReviews />} />
        <Route path="/admin/content" element={<AdminContent />} />
        <Route path="/admin/notifications" element={<AdminNotifications />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AuthProvider>
          <AppRouter />
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
