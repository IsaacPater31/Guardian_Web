import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from '@/app/layout/AppLayout';
import Dashboard from '@/features/dashboard/controller/DashboardPage';
import MapPage from '@/features/map/controller/MapPage';
import AlertsPage from '@/features/alerts/controller/AlertsPage';
import CommunitiesPage from '@/features/communities/controller/CommunitiesPage';
import CommunityDetailPage from '@/features/communities/controller/CommunityDetailPage';
import AdminModulePage from '@/features/admin/controller/AdminModulePage';

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
          <Route path="/admin" element={<AdminModulePage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
