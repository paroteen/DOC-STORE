import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Share2, Download } from "lucide-react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";

export default function DocumentViewer() {
  const { token } = useParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    const fetchDocument = async () => {
      try {
        const docRef = doc(db, "documents", token);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
          setError("Document not found");
        } else {
          const data = docSnap.data();
          if (data.status !== "active") {
            setError("Document unavailable");
          } else {
            setPdfUrl(data.downloadUrl);
          }
        }
      } catch (err) {
        console.error(err);
        setError("An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchDocument();
  }, [token]);

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Shared Document",
          url: url,
        });
      } catch (err) {
        console.error("Error sharing:", err);
      }
    } else {
      navigator.clipboard.writeText(url);
      alert("Link copied to clipboard!");
    }
  };

  if (loading) {
    return <div className="h-screen w-screen flex items-center justify-center bg-[#525659] text-white font-sans">Loading...</div>;
  }

  if (error || !pdfUrl) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#F3F4F6] p-4 text-[#1A1A1B] font-sans">
        <h1 className="text-xl font-medium">{error || "Document not found"}</h1>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-[#525659] overflow-hidden font-sans">
      <div className="flex-none h-12 bg-[#323639] border-b border-white/10 flex items-center justify-end px-4 gap-2 shadow-md z-10">
        <button
          onClick={handleShare}
          className="inline-flex items-center gap-1.5 text-white/80 hover:text-white px-3 py-1.5 rounded bg-black/20 hover:bg-black/30 transition-colors text-sm font-medium"
        >
          <Share2 className="w-4 h-4" />
          Share
        </button>
      </div>
      
      <div className="flex-grow w-full relative bg-[#525659]">
        <object
          data={pdfUrl}
          type="application/pdf"
          className="absolute inset-0 w-full h-full"
        >
          <div className="flex flex-col items-center justify-center h-full text-white p-6 text-center">
            <p className="mb-4">Your browser doesn't support native PDF viewing.</p>
            <a 
              href={pdfUrl} 
              className="inline-flex items-center gap-2 bg-black/30 text-white px-4 py-2 rounded-md hover:bg-black/50 transition-colors font-medium text-sm"
              download
            >
              <Download className="w-4 h-4" />
              Download PDF
            </a>
          </div>
        </object>
      </div>
    </div>
  );
}
