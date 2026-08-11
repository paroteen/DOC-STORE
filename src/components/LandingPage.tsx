import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FileText, Shield, ArrowRight } from "lucide-react";

export default function LandingPage() {
  const [docCode, setDocCode] = useState("");
  const navigate = useNavigate();

  const handleAccess = (e: React.FormEvent) => {
    e.preventDefault();
    const code = docCode.trim();
    if (code) {
      navigate(`/u/${code}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <header className="w-full p-6 flex justify-end items-center">
        <Link
          to="/admin/login"
          className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
        >
          <Shield className="w-4 h-4" />
          Admin Login
        </Link>
      </header>
      
      <main className="flex-1 flex flex-col items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <FileText className="w-8 h-8" />
          </div>
          
          <h1 className="text-2xl font-semibold text-gray-900 mb-3">
            Document Portal
          </h1>
          
          <p className="text-gray-500 text-sm leading-relaxed mb-6">
            Welcome to the secure document sharing portal. Enter your document code below to access your file, or navigate to your specific link directly.
          </p>

          <form onSubmit={handleAccess} className="flex gap-2">
            <input
              type="text"
              value={docCode}
              onChange={(e) => setDocCode(e.target.value)}
              placeholder="Enter document code..."
              className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              required
            />
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center"
              aria-label="Access document"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </main>

      <footer className="w-full p-6 text-center text-xs text-gray-400">
        &copy; {new Date().getFullYear()} Document Portal. All rights reserved.
      </footer>
    </div>
  );
}
