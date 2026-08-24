import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './shared/context/AuthContext';
import { ThemeProvider } from './shared/context/ThemeContext';
import { GuestRoute, ProtectedRoute } from './routes/guards';
import { Unauthorized } from './shared/components/Unauthorized';
import { RefreshCw } from 'lucide-react';

import { ToastProvider } from './shared/context/ToastContext';

// Code-splitting via React.lazy for high-performance loading
const LoginPage = lazy(() => import('./features/auth/components/LoginPage').then(m => ({ default: m.LoginPage })));
const StudentExamsPage = lazy(() => import('./features/student/StudentExamsPage').then(m => ({ default: m.StudentExamsPage })));
const ExamSessionPage = lazy(() => import('./features/student/ExamSessionPage').then(m => ({ default: m.ExamSessionPage })));
const TeacherDashboard = lazy(() => import('./features/teacher/TeacherDashboard').then(m => ({ default: m.TeacherDashboard })));
const TeacherLayout = lazy(() => import('./features/teacher/TeacherLayout').then(m => ({ default: m.TeacherLayout })));
const QuestionBankPage = lazy(() => import('./features/teacher/QuestionBankPage').then(m => ({ default: m.QuestionBankPage })));
const ExamsPage = lazy(() => import('./features/teacher/ExamsPage').then(m => ({ default: m.ExamsPage })));
const GradingPage = lazy(() => import('./features/teacher/GradingPage').then(m => ({ default: m.GradingPage })));
const ExamReportPage = lazy(() => import('./features/teacher/ExamReportPage').then(m => ({ default: m.ExamReportPage })));
const AdminLayout = lazy(() => import('./features/admin/AdminLayout').then(m => ({ default: m.AdminLayout })));
const AdminDashboard = lazy(() => import('./features/admin/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const LiveMonitoringPage = lazy(() => import('./features/admin/LiveMonitoringPage').then(m => ({ default: m.LiveMonitoringPage })));
const MajorsPage = lazy(() => import('./features/admin/MajorsPage').then(m => ({ default: m.MajorsPage })));
const ClassesPage = lazy(() => import('./features/admin/ClassesPage').then(m => ({ default: m.ClassesPage })));
const SubjectsPage = lazy(() => import('./features/admin/SubjectsPage').then(m => ({ default: m.SubjectsPage })));
const AcademicYearsPage = lazy(() => import('./features/admin/AcademicYearsPage').then(m => ({ default: m.AcademicYearsPage })));
const TeachersPage = lazy(() => import('./features/admin/TeachersPage').then(m => ({ default: m.TeachersPage })));
const StudentsPage = lazy(() => import('./features/admin/StudentsPage').then(m => ({ default: m.StudentsPage })));

const PageLoader = () => (
  <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-50 dark:bg-[#070a13] text-slate-800 dark:text-white space-y-4 p-4 transition-colors">
    <div className="relative flex items-center justify-center">
      <div className="h-14 w-14 rounded-2xl bg-indigo-100 dark:bg-indigo-600/20 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-md">
        <RefreshCw className="h-6 w-6 animate-spin" />
      </div>
    </div>
    <div className="text-center space-y-2">
      <p className="text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider">Memuat Komponen CBT...</p>
      <div className="w-40 mx-auto h-1.5 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full animate-progress-indeterminate"></div>
      </div>
    </div>
  </div>
);

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <ThemeProvider>
        <ToastProvider>
          <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Unified Guest routes (Redirect to respective dashboard if already logged in) */}
              <Route element={<GuestRoute />}>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/staff/login" element={<Navigate to="/login" replace />} />
              </Route>

              {/* Protected routes (Require login & role validation) */}
              
              {/* Student routes */}
              <Route element={<ProtectedRoute allowedRoles={['siswa']} />}>
                <Route path="/student/dashboard" element={<StudentExamsPage />} />
                <Route path="/student/session/:attemptId" element={<ExamSessionPage />} />
              </Route>

              {/* Teacher routes */}
              <Route element={<ProtectedRoute allowedRoles={['guru']} />}>
                <Route element={<TeacherLayout />}>
                  <Route path="/teacher/dashboard" element={<TeacherDashboard />} />
                  <Route path="/teacher/questions" element={<QuestionBankPage />} />
                  <Route path="/teacher/exams" element={<ExamsPage />} />
                  <Route path="/teacher/grading" element={<GradingPage />} />
                  <Route path="/teacher/reports" element={<ExamReportPage />} />
                </Route>
              </Route>

              {/* Admin routes */}
              <Route element={<ProtectedRoute allowedRoles={['super_admin', 'admin']} />}>
                <Route element={<AdminLayout />}>
                  <Route path="/admin/dashboard" element={<AdminDashboard />} />
                  <Route path="/admin/proctoring" element={<LiveMonitoringPage />} />
                  <Route path="/admin/reports" element={<ExamReportPage />} />
                  <Route path="/admin/majors" element={<MajorsPage />} />
                  <Route path="/admin/classes" element={<ClassesPage />} />
                  <Route path="/admin/subjects" element={<SubjectsPage />} />
                  <Route path="/admin/academic-years" element={<AcademicYearsPage />} />
                  <Route path="/admin/teachers" element={<TeachersPage />} />
                  <Route path="/admin/students" element={<StudentsPage />} />
                </Route>
              </Route>

              {/* Public utility pages */}
              <Route path="/unauthorized" element={<Unauthorized />} />

              {/* Default fallbacks */}
              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
        </ToastProvider>
      </ThemeProvider>
    </AuthProvider>
  );
};

export default App;
