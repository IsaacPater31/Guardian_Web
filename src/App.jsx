import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/Layout/AppLayout';
import Dashboard from './pages/Dashboard';
import MapPage from './pages/MapPage';
import AlertsPage from './pages/AlertsPage';
import CommunitiesPage from './pages/CommunitiesPage';
import CommunityDetailPage from './pages/CommunityDetailPage';
import AdminModulePage from './pages/AdminModulePage';

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
