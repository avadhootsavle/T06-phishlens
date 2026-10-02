import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Shield, QrCode, Link2, SlidersHorizontal, Info } from 'lucide-react';

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
          <Link to="/" className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-white shadow-sm">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-base tracking-tight text-slate-900 leading-tight">
                PhishLens
              </div>
              <div className="text-[10px] text-slate-500 font-mono tracking-wider uppercase">
                Intent Verification
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

          {/* Right Status Pill */}
          <div className="hidden sm:flex items-center space-x-2">
            <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Engine Active</span>
            </span>
          </div>

          {/* Mobile Quick Action Buttons */}
          <div className="flex md:hidden items-center space-x-1">
            <Link
              to="/scan-qr"
              className="p-2 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors"
              aria-label="Scan QR"
            >
              <QrCode className="w-4 h-4" />
            </Link>
            <Link
              to="/check-url"
              className="p-2 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors"
              aria-label="Check URL"
            >
              <Link2 className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};
