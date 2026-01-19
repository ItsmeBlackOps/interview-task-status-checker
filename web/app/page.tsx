'use client';

import { useState } from 'react';
import MismatchFeed from '@/components/MismatchFeed';
import ReportsFeed from '@/components/ReportsFeed';
import MonitorFeed from '@/components/MonitorFeed';
import { Lock, FileText, CheckCircle, AlertTriangle } from 'lucide-react';

export default function Home() {
  const [activeTab, setActiveTab] = useState('reports');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'Hkpatel@21') {
      setIsAuthenticated(true);
      setAuthError(false);
    } else {
      setAuthError(true);
    }
  };

  const renderTabContent = () => {
    if (activeTab === 'reports') {
      return <ReportsFeed />;
    }

    // Protected Tabs
    if (!isAuthenticated) {
      return (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md border border-slate-100">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="text-purple-600" size={24} />
            </div>
            <h3 className="text-xl font-bold text-center text-slate-900 mb-2">Restricted Access</h3>
            <p className="text-slate-500 text-center mb-6">Please enter the password to view this tab.</p>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                  placeholder="Enter Password"
                  autoFocus
                />
                {authError && <p className="text-red-500 text-sm mt-2">Incorrect password</p>}
              </div>
              <button
                type="submit"
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-xl transition-colors"
              >
                Unlock
              </button>
            </form>
          </div>
        </div>
      );
    }

    if (activeTab === 'monitor') return <MonitorFeed />;
    if (activeTab === 'mismatches') return <MismatchFeed />;

    return null;
  };

  return (
    <main className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            Interview Status Checker
          </h1>

          <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('reports')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'reports'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
                }`}
            >
              <div className="flex items-center gap-2">
                <FileText size={16} />
                Reports
              </div>
            </button>
            <button
              onClick={() => setActiveTab('monitor')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'monitor'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
                }`}
            >
              <div className="flex items-center gap-2">
                <CheckCircle size={16} />
                Monitor
              </div>
            </button>
            <button
              onClick={() => setActiveTab('mismatches')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'mismatches'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
                }`}
            >
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} />
                Mismatches
              </div>
            </button>
          </div>
        </div>
      </header>

      {renderTabContent()}
    </main>
  );
}
