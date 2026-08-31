import AiArchitecture from './AiArchitecture';
import BreProductSettings from './BreProductSettings';
import SecurityDashboard from './SecurityDashboard';

// Settings is navigated from the sidebar sub-items:
//   settings/bre  ·  settings/ai  ·  settings/security
export default function SettingsPage({ section = 'bre' }) {
  return (
    <div className="max-w-6xl mx-auto">
      {section === 'bre' && <BreProductSettings />}
      {section === 'ai' && <AiArchitecture />}
      {section === 'security' && <SecurityDashboard />}
    </div>
  );
}
