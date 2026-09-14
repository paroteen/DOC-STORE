import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { FileText, Copy, Check, Trash2, PowerOff, AlertCircle, RefreshCw } from "lucide-react";
import { supabase } from "../lib/supabase";
import type { User } from "@supabase/supabase-js";

type Document = {
  id: string;
  token: string;
  title: string;
  status: string;
  createdAt: number;
};

export default function AdminDashboard() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [confirmDeleteDoc, setConfirmDeleteDoc] = useState<Document | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/admin/login");
      } else {
        setCurrentUser(session.user);
        fetchDocuments();
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/admin/login");
      } else {
        setCurrentUser(session.user);
        fetchDocuments();
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchDocuments = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .order("createdAt", { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (err: any) {
      console.error("Failed to fetch documents:", err);
      setFetchError(err.message || "Failed to load documents from Supabase.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/admin/login");
  };

  const copyLink = async (token: string) => {
    const url = `${window.location.origin}/u/${token}`;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = url;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        textArea.remove();
      }
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(null), 2500);
    } catch (err) {
      console.error("Failed to copy link:", err);
    }
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    try {
      const { error } = await supabase
        .from("documents")
        .update({ status: newStatus })
        .eq("id", id);
        
      if (error) throw error;
      setDocuments((prev) =>
        prev.map((d) => (d.id === id ? { ...d, status: newStatus } : d))
      );
    } catch (err: any) {
      console.error("Failed to update status:", err);
      alert(err.message || "Failed to update document status");
    }
  };

  const handleDelete = async () => {
    if (!confirmDeleteDoc) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from("documents")
        .delete()
        .eq("id", confirmDeleteDoc.id);
        
      if (error) throw error;
      setDocuments((prev) => prev.filter((d) => d.id !== confirmDeleteDoc.id));
      setConfirmDeleteDoc(null);
    } catch (err: any) {
      console.error("Failed to delete document:", err);
      alert(err.message || "Failed to delete document");
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading && !currentUser) {
    return (
      <div className="min-h-screen bg-[#F3F4F6] flex items-center justify-center text-[#1A1A1B] font-sans">
        <div className="flex items-center gap-3">
          <RefreshCw className="w-5 h-5 animate-spin text-gray-600" />
          <span className="font-medium text-gray-700">Verifying authentication...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F3F4F6] text-[#1A1A1B] font-sans">
      <nav className="flex items-center justify-between px-6 sm:px-8 py-4 bg-white border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-black rounded flex items-center justify-center">
            <span className="text-white font-bold text-xs">PT</span>
          </div>
          <div>
            <h1 className="font-semibold text-lg tracking-tight leading-tight">
              ParoTeen <span className="text-gray-400 font-normal">Admin</span>
            </h1>
            {currentUser?.email && (
              <p className="text-[11px] text-gray-500 font-mono leading-tight">{currentUser.email}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/admin/upload"
            className="px-4 py-2 text-sm font-medium text-white bg-black rounded-md hover:bg-gray-800 transition-colors shadow-sm"
          >
            + New Document
          </Link>
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
          >
            Logout
          </button>
        </div>
      </nav>

      <main className="flex-1 p-6 sm:p-8 max-w-7xl mx-auto w-full">
        {fetchError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 text-red-700">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-sm">Error Loading Documents</p>
              <p className="text-xs mt-0.5">{fetchError}</p>
            </div>
            <button
              onClick={fetchDocuments}
              className="text-xs font-semibold px-3 py-1 bg-red-100 hover:bg-red-200 text-red-800 rounded transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500">Recent Documents</h2>
              <span className="text-xs text-gray-400 font-mono">({documents.length})</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={fetchDocuments}
                className="text-xs text-gray-500 hover:text-black flex items-center gap-1 font-medium transition-colors"
                title="Refresh documents list"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </button>
              <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold uppercase">
                System Live
              </span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Document</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {documents.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                      {loading ? "Loading documents..." : "No documents uploaded yet."}
                    </td>
                  </tr>
                ) : (
                  documents.map((doc) => (
                    <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <FileText className="w-5 h-5 text-gray-400 mr-3 flex-shrink-0" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">{doc.title}</div>
                            <div className="text-sm text-gray-500 font-mono text-xs mt-0.5">/u/{doc.token}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {doc.createdAt ? new Date(doc.createdAt).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          doc.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {doc.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-3">
                          <Link
                            to={`/u/${doc.token}`}
                            target="_blank"
                            className="text-indigo-600 hover:text-indigo-900 text-xs font-semibold px-2 py-1 rounded hover:bg-indigo-50 transition-colors"
                          >
                            Open
                          </Link>
                          <button
                            onClick={() => copyLink(doc.token)}
                            className="text-gray-500 hover:text-gray-900 p-1 rounded hover:bg-gray-100 transition-colors flex items-center gap-1 text-xs"
                            title="Copy link"
                          >
                            {copiedToken === doc.token ? (
                              <span className="text-green-600 flex items-center gap-1 font-semibold">
                                <Check className="w-3.5 h-3.5" /> Copied!
                              </span>
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                          <button 
                            onClick={() => toggleStatus(doc.id, doc.status)} 
                            className={`p-1 rounded hover:bg-gray-100 transition-colors ${
                              doc.status === 'active' ? 'text-orange-500 hover:text-orange-700' : 'text-green-600 hover:text-green-800'
                            }`}
                            title={doc.status === 'active' ? 'Deactivate' : 'Activate'}
                          >
                            <PowerOff className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setConfirmDeleteDoc(doc)}
                            className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {confirmDeleteDoc && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-xl border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Document</h3>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to permanently delete <strong className="text-gray-900 font-medium">"{confirmDeleteDoc.title}"</strong>? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                disabled={isDeleting}
                onClick={() => setConfirmDeleteDoc(null)}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                disabled={isDeleting}
                onClick={handleDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
