'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, Activity, AlertOctagon, CheckCircle2, Lock, LogIn, Menu, X, ChevronRight } from 'lucide-react';
import ReportsFeed from '@/components/ReportsFeed';
import MonitorFeed from '@/components/MonitorFeed';
import MismatchFeed from '@/components/MismatchFeed';
import ValidationFeed from '@/components/ValidationFeed';

export default function Home() {
  const [activeTab, setActiveTab] = useState('reports');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState(false);
  const [isSidebarOpen, setSidebarOpen] = useState(true);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'Hkpatel@21') {
      setIsAuthenticated(true);
      setAuthError(false);
    } else {
      setAuthError(true);
    }
  };

  const menuItems = [
    { id: 'reports', label: 'Analytics', icon: LayoutDashboard },
    { id: 'monitor', label: 'Live Feed', icon: Activity, protected: true },
    { id: 'mismatches', label: 'Mismatches', icon: AlertOctagon, protected: true },
    { id: 'validation', label: 'Validation', icon: CheckCircle2, protected: true },
  ];

  const renderContent = () => {
    // Auth Guard
    const currentItem = menuItems.find(item => item.id === activeTab);
    if (currentItem?.protected && !isAuthenticated) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-2xl shadow-2xl max-w-md w-full">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-purple-500/10 rounded-full flex items-center justify-center">
                <Lock className="text-purple-400" size={32} />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-center text-white mb-2">Restricted Access</h2>
            <p className="text-slate-400 text-center mb-8">Please enter the access code to view this module.</p>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter Password"
                  className="w-full bg-slate-900/50 border border-slate-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all placeholder:text-slate-600"
                  autoFocus
                />
              </div>
              {authError && (
                <p className="text-red-400 text-sm text-center">Incorrect password. Please try again.</p>
              )}
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-purple-900/20 active:scale-95"
              >
                Access Module
              </button>
            </form>
          </div>
        </div>
      );
    }

    switch (activeTab) {
      case 'reports': return <ReportsFeed />;
      case 'monitor': return <MonitorFeed />;
      case 'mismatches': return <MismatchFeed />;
      case 'validation': return <ValidationFeed />;
      default: return null;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950 text-slate-100 font-sans">
      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: isSidebarOpen ? 280 : 80 }}
        className="relative z-20 h-full bg-slate-900/50 backdrop-blur-xl border-r border-white/5 flex flex-col transition-all duration-300"
      >
        {/* Logo Area */}
        <div className="h-20 flex items-center px-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shrink-0 shadow-lg shadow-purple-500/20">
              <CheckCircle2 className="text-white" size={20} />
            </div>
            {isSidebarOpen && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="font-bold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400"
              >
                TaskStatus
              </motion.span>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-8 space-y-2">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative overflow-hidden ${activeTab === item.id
                  ? 'bg-purple-500/10 text-purple-300 shadow-inner'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
            >
              {activeTab === item.id && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-purple-500/10 rounded-xl"
                  initial={false}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <item.icon size={20} className={activeTab === item.id ? 'text-purple-400' : 'text-slate-500 group-hover:text-white transition-colors'} />
              {isSidebarOpen && (
                <span className="font-medium whitespace-nowrap">{item.label}</span>
              )}
              {isSidebarOpen && activeTab === item.id && (
                <ChevronRight size={16} className="ml-auto text-purple-500/50" />
              )}
            </button>
          ))}
        </nav>

        {/* User Profile (Dummy) */}
        <div className="p-4 border-t border-white/5">
          <button className="flex items-center gap-3 w-full p-2 rounded-xl hover:bg-white/5 transition-colors">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-slate-700 to-slate-600 flex items-center justify-center shrink-0 border border-white/10">
              <span className="font-bold text-sm">HP</span>
            </div>
            {isSidebarOpen && (
              <div className="text-left overflow-hidden">
                <p className="text-sm font-medium text-white truncate">Harsh Patel</p>
                <p className="text-xs text-slate-500 truncate">Admin</p>
              </div>
            )}
          </button>
        </div>

        {/* Toggle Button */}
        <button
          onClick={() => setSidebarOpen(!isSidebarOpen)}
          className="absolute -right-3 top-24 w-6 h-6 bg-slate-800 border border-slate-700 rounded-full flex items-center justify-center text-slate-400 hover:text-white shadow-lg z-50 transition-colors"
        >
          <ChevronRight size={14} className={`transition-transform duration-300 ${isSidebarOpen ? 'rotate-180' : ''}`} />
        </button>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 h-full overflow-y-auto relative scroll-smooth">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-slate-950/80 backdrop-blur-md border-b border-white/5 px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              {menuItems.find(m => m.id === activeTab)?.label}
            </h1>
            <p className="text-slate-500 text-sm mt-1">Overview and management</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs font-mono text-slate-500 bg-slate-900 px-3 py-1 rounded-full border border-white/5">
              v1.2.0-beta
            </span>
          </div>
        </header>

        {/* Content Area */}
        <div className="p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="w-full"
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
