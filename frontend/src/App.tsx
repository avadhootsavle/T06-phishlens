import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Home } from './pages/Home';
import { QRScanner } from './pages/QRScanner';
import { UrlAnalyzer } from './pages/UrlAnalyzer';
import { ResultPage } from './pages/ResultPage';
import { ReportPage } from './pages/ReportPage';
import { AdminDashboard } from './pages/AdminDashboard';
import { About } from './pages/About';

export const App: React.FC = () => {
  return (
    <Router>
      <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col font-sans">
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
          </Routes>
        </main>
        <footer className="border-t border-slate-800/80 py-6 text-center text-xs text-slate-500 font-mono">
          PhishLens Intent-Aware Cybersecurity Engine • Hackathon Build
        </footer>
      </div>
    </Router>
  );
};

export default App;
