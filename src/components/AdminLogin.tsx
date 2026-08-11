import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock } from "lucide-react";

export default function AdminLogin() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        navigate("/admin");
      } else {
        setError(data.error || "Login failed");
      }
    } catch (err) {
      setError("An error occurred");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F3F4F6] p-4 text-[#1A1A1B] font-sans">
      <div className="w-full max-w-md bg-white p-8 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-black rounded flex items-center justify-center mb-4">
            <Lock className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Admin Access</h1>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-md focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-shadow"
              required
              autoFocus
            />
          </div>

          {error && <p className="text-red-500 text-sm font-medium">{error}</p>}

          <button
            type="submit"
            className="w-full bg-black text-white font-medium py-2 px-4 rounded-md hover:bg-gray-800 transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-black outline-none"
          >
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}
