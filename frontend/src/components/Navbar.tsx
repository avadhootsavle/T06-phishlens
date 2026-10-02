import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Shield, QrCode, Link2, AlertTriangle, Info, Terminal } from 'lucide-react';

export const Navbar: React.FC = () => {
  const location = useLocation();

  const navItems = [
    { to: '/', label: 'Home', icon: Shield },
    { to: '/scan-qr', label: 'Scan QR', icon: QrCode },
    { to: '/check-url', label: 'Check Link', icon: Link2 },
    { to: '/admin', label: 'Admin Triage', icon: Terminal },
    { to: '/about', label: 'About', icon: Info },
  ];

  return (
    <nav className="sticky top-0 z-50 glass-nav border-b border-slate-800">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform duration-200">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-cyan-400 bg-clip-text text-transparent">
                PhishLens
              </div>
              <div className="text-[10px] text-cyan-400 font-mono tracking-wider uppercase -mt-1">
                Intent-Aware Security
              </div>
            </div>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Mobile Fast Actions */}
          <div className="flex md:hidden items-center space-x-2">
            <Link
              to="/scan-qr"
              className="p-2 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
              aria-label="Scan QR"
            >
              <QrCode className="w-5 h-5" />
            </Link>
            <Link
              to="/check-url"
              className="p-2 rounded-lg bg-slate-800 text-slate-300 border border-slate-700"
              aria-label="Check URL"
            >
              <Link2 className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};
