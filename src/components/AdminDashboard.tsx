import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Upload, FileText, Settings, Copy, Download, Trash2, PowerOff } from "lucide-react";
import { auth, db } from "../lib/firebase";
import { collection, getDocs, updateDoc, deleteDoc, doc as firestoreDoc, orderBy, query } from "firebase/firestore";
import { signOut } from "firebase/auth";

type Document = {
  id: string;
  token: string;
  title: string;
  status: string;
  createdAt: number;
};

export default function AdminDashboard() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        navigate("/admin/login");
      } else {
        fetchDocuments();
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  const fetchDocuments = async () => {
    try {
      const q = query(collection(db, "documents")); // orderBy requires composite index if not standard, let's keep it simple
      const snapshot = await getDocs(q);
      const docs: Document[] = [];
      snapshot.forEach((doc) => {
        docs.push({ id: doc.id, ...doc.data() } as Document);
      });
      docs.sort((a, b) => b.createdAt - a.createdAt);
      setDocuments(docs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/admin/login");
  };

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/u/${token}`;
    navigator.clipboard.writeText(url);
    alert("Link copied!");
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    await updateDoc(firestoreDoc(db, "documents", id), { status: newStatus });
    fetchDocuments();
  };

  const deleteDocument = async (id: string) => {
    if (confirm("Are you sure you want to delete this document permanently?")) {
      await deleteDoc(firestoreDoc(db, "documents", id));
      // Optionally delete from Firebase Storage if possible, or leave it orphaned for now
      fetchDocuments();
    }
  };


  if (loading) return <div className="min-h-screen bg-[#F3F4F6] flex items-center justify-center text-[#1A1A1B] font-sans">Loading...</div>;

  return (
    <div className="min-h-screen flex flex-col bg-[#F3F4F6] text-[#1A1A1B] font-sans">
      <nav className="flex items-center justify-between px-8 py-4 bg-white border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-black rounded flex items-center justify-center">
            <span className="text-white font-bold text-xs">PT</span>
          </div>
          <h1 className="font-semibold text-lg tracking-tight">ParoTeen <span className="text-gray-400 font-normal">Admin</span></h1>
        </div>
        <div className="flex gap-4">
          <button onClick={handleLogout} className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors">
            Logout
          </button>
          <Link
            to="/admin/upload"
            className="px-4 py-2 text-sm font-medium text-white bg-black rounded-md hover:bg-gray-800 transition-colors"
          >
            + New Document
          </Link>
        </div>
      </nav>

      <main className="flex-1 p-6 sm:p-8 max-w-7xl mx-auto w-full">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500">Recent Documents</h2>
            <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold uppercase">System Live</span>
          </div>
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
                    No documents uploaded yet.
                  </td>
                </tr>
              ) : (
                documents.map((doc) => (
                  <tr key={doc.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <FileText className="w-5 h-5 text-gray-400 mr-3" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{doc.title}</div>
                          <div className="text-sm text-gray-500 font-mono text-xs mt-1">/u/{doc.token}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        doc.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {doc.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-3">
                        <Link to={`/u/${doc.token}`} target="_blank" className="text-indigo-600 hover:text-indigo-900" title="Open Public Link">
                          Open
                        </Link>
                        <button onClick={() => copyLink(doc.token)} className="text-gray-500 hover:text-gray-900" title="Copy Link">
                          <Copy className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => toggleStatus(doc.id, doc.status)} 
                          className={`${doc.status === 'active' ? 'text-orange-500 hover:text-orange-700' : 'text-green-500 hover:text-green-700'}`}
                          title={doc.status === 'active' ? 'Deactivate' : 'Activate'}
                        >
                          <PowerOff className="w-4 h-4" />
                        </button>
                        <button onClick={() => deleteDocument(doc.id)} className="text-red-500 hover:text-red-700" title="Delete">
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
      </main>
    </div>
  );
}
