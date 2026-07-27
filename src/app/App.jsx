import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from '@/app/layout/AppLayout';
import Dashboard from '@/features/dashboard/controller/DashboardPage';
import MapPage from '@/features/map/controller/MapPage';
import AlertsPage from '@/features/alerts/controller/AlertsPage';
import CommunitiesPage from '@/features/communities/controller/CommunitiesPage';
import CommunityDetailPage from '@/features/communities/controller/CommunityDetailPage';
import AdminUsersPage from '@/features/admin/controller/AdminUsersPage';
import AdminCommunitiesPage from '@/features/admin/controller/AdminCommunitiesPage';
import UserDetailPage from '@/features/admin/controller/UserDetailPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<MapPage />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/map" element={<Navigate to="/" replace />} />
          <Route path="/alerts" element={<AlertsPage />} />
          <Route path="/communities" element={<CommunitiesPage />} />
          <Route path="/communities/:id" element={<CommunityDetailPage />} />
          <Route path="/admin" element={<Navigate to="/admin/users" replace />} />
          <Route path="/admin/users" element={<AdminUsersPage />} />
          <Route path="/admin/users/:uid" element={<UserDetailPage />} />
          <Route path="/admin/communities" element={<AdminCommunitiesPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
