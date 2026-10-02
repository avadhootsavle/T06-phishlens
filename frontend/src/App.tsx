import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Home } from './pages/Home';
import { QRScanner } from './pages/QRScanner';
import { UrlAnalyzer } from './pages/UrlAnalyzer';
import { ResultPage } from './pages/ResultPage';
import { ReportPage } from './pages/ReportPage';
import { AdminDashboard } from './pages/AdminDashboard';
import { About } from './pages/About';
import { MerchantVerifyRedirect } from './pages/MerchantVerifyRedirect';

export const App: React.FC = () => {
  return (
    <Router>
      <div className="min-h-screen bg-[#f8f9fa] text-slate-900 flex flex-col font-sans selection:bg-slate-200">
        <Navbar />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/scan-qr" element={<QRScanner />} />
            <Route path="/check-url" element={<UrlAnalyzer />} />
            <Route path="/result" element={<ResultPage />} />
            <Route path="/report" element={<ReportPage />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/about" element={<About />} />
            <Route path="/m/:token" element={<MerchantVerifyRedirect />} />
          </Routes>
        </main>
        <footer className="border-t border-slate-200 bg-white py-6 mt-12 text-center text-xs text-slate-500 font-mono">
          <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              PhishLens Intent-Aware Cybersecurity Engine
            </div>
            <div className="flex items-center space-x-4 text-[11px] text-slate-600 font-sans">
              <Link to="/about" className="hover:text-slate-900">Architecture</Link>
              <Link to="/about" className="hover:text-slate-900">Privacy Policy</Link>
              <Link to="/about" className="hover:text-slate-900">Terms</Link>
              <Link to="/admin" className="hover:text-slate-900">Admin</Link>
            </div>
          </div>
        </footer>
      </div>
    </Router>
  );
};

export default App;
