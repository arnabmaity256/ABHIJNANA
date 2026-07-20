import { Routes, Route } from 'react-router-dom';
import { PublicLayout } from './components/PublicLayout.jsx';
import { ConsoleLayout } from './components/ConsoleLayout.jsx';

import { Home } from './pages/Home.jsx';
import { Check } from './pages/Check.jsx';
import { Report } from './pages/Report.jsx';
import { PublicRegistry } from './pages/PublicRegistry.jsx';
import { About } from './pages/About.jsx';
import { Verify } from './pages/Verify.jsx';
import { Terms } from './pages/Terms.jsx';

import { Login } from './pages/console/Login.jsx';
import { Dashboard } from './pages/console/Dashboard.jsx';
import { FlagVideo } from './pages/console/FlagVideo.jsx';
import { ConsoleRegistry } from './pages/console/ConsoleRegistry.jsx';
import { RecordDetail } from './pages/console/RecordDetail.jsx';
import { AuditLog } from './pages/console/AuditLog.jsx';
import { Disputes } from './pages/console/Disputes.jsx';
import { Reports } from './pages/console/Reports.jsx';
import { Team } from './pages/console/Team.jsx';

import { isConsoleSubdomain } from './lib/domains.js';

export function App() {
  if (isConsoleSubdomain()) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<ConsoleLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="flag" element={<FlagVideo />} />
          <Route path="registry" element={<ConsoleRegistry />} />
          <Route path="registry/:id" element={<RecordDetail />} />
          <Route path="reports" element={<Reports />} />
          <Route path="team" element={<Team />} />
          <Route path="audit" element={<AuditLog />} />
          <Route path="disputes" element={<Disputes />} />
        </Route>
      </Routes>
    );
  }

  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<Home />} />
        <Route path="/check" element={<Check />} />
        <Route path="/report" element={<Report />} />
        <Route path="/registry" element={<PublicRegistry />} />
        <Route path="/about" element={<About />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/verify/:id" element={<Verify />} />
      </Route>
    </Routes>
  );
}
