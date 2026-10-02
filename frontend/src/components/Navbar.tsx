import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Shield, QrCode, Link2, SlidersHorizontal, Info, Download } from 'lucide-react';

export const Navbar: React.FC = () => {
  const location = useLocation();

  const navItems = [
    { to: '/', label: 'Overview', icon: Shield },
    { to: '/scan-qr', label: 'Scan QR', icon: QrCode },
    { to: '/check-url', label: 'Check Link', icon: Link2 },
    { to: '/admin', label: 'Triage', icon: SlidersHorizontal },
    { to: '/about', label: 'Architecture', icon: Info },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-white/95 border-b border-slate-200 backdrop-blur-sm">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          <Link to="/" className="flex items-center space-x-2.5 group">
            <span className="w-2 h-2 rounded-full bg-emerald-500 ring-4 ring-emerald-50" />
            <span className="font-mono text-xs font-semibold text-slate-900 tracking-tight group-hover:text-slate-700 transition-colors">
              verify<span className="text-slate-400 font-normal">.local</span>
            </span>
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
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-slate-100 text-slate-900 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Right Status Pill & Install Button */}
          <div className="hidden sm:flex items-center space-x-2">
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('open-pwa-install'))}
              className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
              title="Install PhishLens App"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Install App</span>
            </button>
            <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Engine Active</span>
            </span>
          </div>

          {/* Mobile Quick Action Buttons */}
          <div className="flex md:hidden items-center space-x-0.5">
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('open-pwa-install'))}
              className="p-1.5 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors"
              aria-label="Install App"
              title="Install App"
            >
              <Download className="w-4 h-4" />
            </button>
            <Link
              to="/scan-qr"
              className="p-1.5 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors"
              aria-label="Scan QR"
              title="Scan QR"
            >
              <QrCode className="w-4 h-4" />
            </Link>
            <Link
              to="/check-url"
              className="p-1.5 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors"
              aria-label="Check URL"
              title="Check URL"
            >
              <Link2 className="w-4 h-4" />
            </Link>
            <Link
              to="/admin"
              className="p-1.5 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors"
              aria-label="Triage"
              title="Triage"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </Link>
            <Link
              to="/about"
              className="p-1.5 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors"
              aria-label="About"
              title="About"
            >
              <Info className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};
