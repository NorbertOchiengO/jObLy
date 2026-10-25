import { Navigate, Route, Routes } from "react-router-dom";
import { LandingPage } from "../modules/Landing/Landing";
import Register from "../modules/Build/user/Register";
import Login from "../modules/Build/user/Login";
import OAuthCallback from "../modules/Build/user/OAuthCallback";
import EmployerDashboard from "../modules/Build/dashboard/employerdashboard/EmployerDashboard";
import Overview from "../modules/Build/dashboard/employerdashboard/Overview";
import JobListings from "../modules/Build/dashboard/employerdashboard/JobListings";
import JobForm from "../modules/Build/dashboard/employerdashboard/JobForm";
import Applicants from "../modules/Build/dashboard/employerdashboard/Applicants";
import EmployeeDashboard from "../modules/Build/dashboard/EmployeeDashboard/EmployeeDashboard";
import MyApplications from "../modules/Build/dashboard/EmployeeDashboard/MyApplications";
import ProfilePage from "../modules/Build/dashboard/EmployeeDashboard/ProfilePage";
import CompanyProfilePage from "../modules/Build/dashboard/employerdashboard/CompanyProfilePage";
import JobSearchPage from "../modules/Build/Searchengine/JobSearchPage";
import JobPage from "../modules/Build/Searchengine/JobPage";
import ApplyPage from "../modules/Build/Searchengine/ApplyPage";
import ProtectedRoute from "../components/ProtectedRoute";
import CompaniesPage from "../modules/Build/Companies/CompaniesPage";
import CompanyPage from "../modules/Build/Companies/CompanyPage";

export const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/register" element={<Register />} />
      <Route path="/login" element={<Login />} />
      <Route path="/oauth/callback" element={<OAuthCallback />} />
      <Route path="/dashboard" element={<ProtectedRoute role="company"><EmployerDashboard /></ProtectedRoute>}>
        <Route index element={<Overview />} />
        <Route path="jobs" element={<JobListings />} />
        <Route path="jobs/new" element={<JobForm />} />
        <Route path="jobs/:id/edit" element={<JobForm />} />
        <Route path="applicants" element={<Applicants />} />
        <Route path="profile" element={<CompanyProfilePage />} />
      </Route>
      <Route path="/clientdashboard" element={<ProtectedRoute role="individual"><EmployeeDashboard /></ProtectedRoute>}>
        <Route index element={<MyApplications />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>
      <Route path="/jobs" element={<JobSearchPage />} />
      <Route path="/job/:id" element={<JobPage />} />
      <Route path="/apply/:id" element={<ProtectedRoute role="individual"><ApplyPage /></ProtectedRoute>} />
      <Route path="/employers" element={<CompaniesPage />} />
      <Route path="/employer/:id" element={<CompanyPage />} />
      <Route path="/*" element={<Navigate to="/" />} />
    </Routes>
  );
};
