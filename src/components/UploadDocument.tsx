import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Upload, ArrowLeft, CheckCircle } from "lucide-react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { setDoc, doc as firestoreDoc } from "firebase/firestore";
import { storage, db, auth } from "../lib/firebase";
import { nanoid } from "nanoid";
import QRCode from "qrcode";

export default function UploadDocument() {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ publicUrl: string; qrDataUrl: string } | null>(null);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    if (!auth.currentUser) {
      setError("You must be logged in to upload documents.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const token = nanoid(12);
      const storageRef = ref(storage, `documents/${token}.pdf`);
      
      await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(storageRef);
      const publicUrl = `${window.location.origin}/u/${token}`;

      const newDoc = {
        token,
        title: title || file.name,
        originalFilename: file.name,
        storagePath: `documents/${token}.pdf`,
        downloadUrl,
        mimeType: file.type,
        fileSize: file.size,
        status: "active",
        createdAt: Date.now()
      };
      
      await setDoc(firestoreDoc(db, "documents", token), newDoc);

      const qrDataUrl = await QRCode.toDataURL(publicUrl, {
        width: 400,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' }
      });
      
      setResult({ publicUrl, qrDataUrl });
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred during upload");
    } finally {
      setLoading(false);
    }
  };

  if (result) {
    return (
      <div className="min-h-screen bg-[#F3F4F6] flex items-center justify-center p-4 text-[#1A1A1B] font-sans">
        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 max-w-md w-full text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle className="w-12 h-12 text-green-500" />
          </div>
          <h2 className="text-xl font-semibold tracking-tight mb-2">Document Uploaded Successfully</h2>
          
          <div className="mt-6 mb-6">
            <img src={result.qrDataUrl} alt="QR Code" className="mx-auto border border-gray-200 rounded-md p-2 w-48 h-48" />
          </div>

          <div className="bg-gray-50 p-3 rounded-md mb-6 break-all border border-gray-100">
            <a href={result.publicUrl} target="_blank" className="text-indigo-600 text-sm hover:underline font-mono">
              {result.publicUrl}
            </a>
          </div>

          <div className="space-y-3">
            <a 
              href={result.qrDataUrl} 
              download="qr-code.png"
              className="block w-full bg-gray-100 text-gray-900 py-2 px-4 rounded-md hover:bg-gray-200 transition-colors font-medium text-sm"
            >
              Download QR Code
            </a>
            <button 
              onClick={() => {
                navigator.clipboard.writeText(result.publicUrl);
                alert("Link copied!");
              }}
              className="block w-full bg-gray-100 text-gray-900 py-2 px-4 rounded-md hover:bg-gray-200 transition-colors font-medium text-sm outline-none"
            >
              Copy Link
            </button>
            <Link 
              to="/admin"
              className="block w-full bg-black text-white py-2 px-4 rounded-md hover:bg-gray-800 transition-colors mt-4 font-medium text-sm"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F3F4F6] p-4 sm:p-8 text-[#1A1A1B] font-sans">
      <div className="max-w-xl mx-auto">
        <Link to="/admin" className="inline-flex items-center text-sm text-gray-500 hover:text-black font-medium mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Dashboard
        </Link>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500">Upload New PDF</h2>
          </div>
          
          <div className="p-6">
            <form onSubmit={handleUpload} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Document Title (Optional)
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Q3 Financial Report"
                  className="w-full px-4 py-2 border border-gray-200 rounded-md focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-shadow"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  PDF File
                </label>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-md focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-shadow"
                  required
                />
              </div>

              {error && <p className="text-red-500 text-sm font-medium">{error}</p>}

              <button
                type="submit"
                disabled={loading || !file}
                className="w-full inline-flex justify-center items-center gap-2 bg-black text-white font-medium py-2 px-4 rounded-md hover:bg-gray-800 transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-black outline-none disabled:opacity-50"
              >
                <Upload className="w-4 h-4" />
                {loading ? "Uploading..." : "Upload Document"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
