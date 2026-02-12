import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider as MUIThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { ResearchProvider } from './contexts/ResearchContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import PatientList from './pages/PatientList';
import PatientDetail from './pages/PatientDetail';
import DataUpload from './pages/DataUpload';
import Settings from './pages/Settings';
import Profile from './pages/Profile';
import AdminDashboard from './pages/admin/AdminDashboard';
import UserManagement from './pages/admin/UserManagement';
import DataManagement from './pages/admin/DataManagement';
import CustomFields from './pages/admin/CustomFields';
import AuditLogs from './pages/admin/AuditLogs';
import RedcapConfigs from './pages/admin/RedcapConfigs';
import SystemMonitoring from './pages/admin/SystemMonitoring';
import SessionManagement from './pages/admin/SessionManagement';
import BackupRecovery from './pages/admin/BackupRecovery';
// Workflows removed - workflow automation is an EMR feature
import DataInsights from './pages/DataInsights';
import DataQuality from './pages/DataQuality';
import Help from './pages/Help';
import DataExplorer from './pages/DataExplorer';
import MLStatistics from './pages/MLStatistics';
import ClinicalReports from './pages/ClinicalReports';
import ResearchAnalytics from './pages/ResearchAnalytics';
import ErrorAnalysis from './pages/ErrorAnalysis';

// Global security check - enforce HTTPS in production
if (process.env.NODE_ENV === 'production' && window.location.protocol !== 'https:') {
  // Redirect to HTTPS
  window.location.replace(window.location.href.replace('http:', 'https:'));
}

function AppContent() {
  const { theme } = useTheme();
  
  return (
        <MUIThemeProvider theme={theme}>
          <CssBaseline />
          <Router>
            <AuthProvider>
              <ResearchProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/*"
              element={
                <Layout>
                  <Routes>
                    <Route
                      path="/"
                      element={
                        <ProtectedRoute>
                          <ResearchAnalytics />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/patients"
                      element={
                        <ProtectedRoute>
                          <PatientList />
                        </ProtectedRoute>
                      }
                    />
                    {/* Patient viewing only - data-driven analytics focus */}
                    <Route
                      path="/patients/:id"
                      element={
                        <ProtectedRoute>
                          <PatientDetail />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/upload"
                      element={
                        <ProtectedRoute requireAdmin>
                          <DataUpload />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/analytics"
                      element={
                        <ProtectedRoute>
                          <ResearchAnalytics />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/error-analysis"
                      element={
                        <ProtectedRoute>
                          <ErrorAnalysis />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/data-explorer"
                      element={
                        <ProtectedRoute>
                          <DataExplorer />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/data-insights"
                      element={
                        <ProtectedRoute>
                          <DataInsights />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/data-quality"
                      element={
                        <ProtectedRoute>
                          <DataQuality />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/ml-statistics"
                      element={
                        <ProtectedRoute>
                          <MLStatistics />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/clinical-reports"
                      element={
                        <ProtectedRoute>
                          <ClinicalReports />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/profile"
                      element={
                        <ProtectedRoute>
                          <Profile />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/settings"
                      element={
                        <ProtectedRoute>
                          <Settings />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/help"
                      element={
                        <ProtectedRoute>
                          <Help />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin"
                      element={
                        <ProtectedRoute requireAdmin>
                          <AdminDashboard />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/users"
                      element={
                        <ProtectedRoute requireAdmin>
                          <UserManagement />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/data"
                      element={
                        <ProtectedRoute requireAdmin>
                          <DataManagement />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/custom-fields"
                      element={
                        <ProtectedRoute requireAdmin>
                          <CustomFields />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/audit-logs"
                      element={
                        <ProtectedRoute requireAdmin>
                          <AuditLogs />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/redcap-configs"
                      element={
                        <ProtectedRoute requireAdmin>
                          <RedcapConfigs />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/monitoring"
                      element={
                        <ProtectedRoute requireAdmin>
                          <SystemMonitoring />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/sessions"
                      element={
                        <ProtectedRoute requireAdmin>
                          <SessionManagement />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/backup"
                      element={
                        <ProtectedRoute requireAdmin>
                          <BackupRecovery />
                        </ProtectedRoute>
                      }
                    />
                    {/* Workflows route removed - workflow automation is an EMR feature */}
                  </Routes>
                </Layout>
              }
            />
          </Routes>
              </ResearchProvider>
        </AuthProvider>
      </Router>
    </MUIThemeProvider>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;
