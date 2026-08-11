import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import fs from "fs";
import multer from "multer";
import { nanoid } from "nanoid";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import { db } from "./src/db/db";
import { documents } from "./src/db/schema";
import { eq } from "drizzle-orm";
import QRCode from "qrcode";
import dotenv from "dotenv";

dotenv.config();

const UPLOADS_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Minimal SQLite database setup using Drizzle
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOADS_DIR);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, `${nanoid()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDFs are allowed"));
    }
  },
});

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-paro-teen";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";

async function startServer() {
  const app = express();
  const PORT = 3000;
  
  app.use(express.json());
  app.use(cookieParser());

  // --- API Routes ---
  
  // Auth
  app.post("/api/auth/login", (req, res) => {
    const { password } = req.body;
    if (password === ADMIN_PASSWORD) {
      const token = jwt.sign({ role: "admin" }, JWT_SECRET, { expiresIn: "1d" });
      res.cookie("token", token, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        maxAge: 24 * 60 * 60 * 1000
      });
      res.json({ success: true });
    } else {
      res.status(401).json({ error: "Invalid password" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    res.clearCookie("token", {
      httpOnly: true,
      secure: true,
      sameSite: "none",
    });
    res.json({ success: true });
  });

  const requireAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: "Unauthorized" });
    try {
      jwt.verify(token, JWT_SECRET);
      next();
    } catch {
      res.status(401).json({ error: "Unauthorized" });
    }
  };

  app.get("/api/auth/me", requireAdmin, (req, res) => {
    res.json({ success: true });
  });

  // Upload Document
  app.post("/api/documents", requireAdmin, upload.single("file"), async (req: express.Request, res: express.Response): Promise<void> => {
    try {
      const file = (req as any).file;
      if (!file) {
        res.status(400).json({ error: "No file uploaded" });
        return;
      }
      
      const title = req.body.title || file.originalname;
      const token = nanoid(12);
      
      const newDoc = {
        token,
        title,
        originalFilename: file.originalname,
        storagePath: file.filename,
        mimeType: file.mimetype,
        fileSize: file.size,
        status: "active",
      };
      
      const [inserted] = await db.insert(documents).values(newDoc).returning();
      
      // Generate QR Code
      const appUrl = process.env.APP_URL || `http://localhost:${PORT}`;
      const publicUrl = `${appUrl}/u/${token}`;
      const qrDataUrl = await QRCode.toDataURL(publicUrl, {
        width: 400,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });
      
      res.json({ ...inserted, publicUrl, qrDataUrl });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  // List Documents
  app.get("/api/documents", requireAdmin, async (req, res) => {
    try {
      const docs = await db.select().from(documents);
      res.json(docs);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch documents" });
    }
  });

  // Deactivate/Activate Document
  app.patch("/api/documents/:id/status", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const [updated] = await db
        .update(documents)
        .set({ status })
        .where(eq(documents.id, parseInt(id)))
        .returning();
      res.json(updated);
    } catch (err) {
      res.status(500).json({ error: "Failed to update status" });
    }
  });
  
  // Delete Document
  app.delete("/api/documents/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      
      const docs = await db.select().from(documents).where(eq(documents.id, parseInt(id)));
      if (docs.length === 0) return res.status(404).json({ error: "Not found" });
      
      const filePath = path.join(UPLOADS_DIR, docs[0].storagePath);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      
      await db.delete(documents).where(eq(documents.id, parseInt(id)));
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete" });
    }
  });

  // Public Get Document Meta
  app.get("/api/public/documents/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const docs = await db.select().from(documents).where(eq(documents.token, token));
      if (docs.length === 0) return res.status(404).json({ error: "Not found" });
      
      const doc = docs[0];
      if (doc.status !== "active") {
        return res.status(403).json({ error: "Document unavailable" });
      }
      
      res.json({ title: doc.title, token: doc.token });
    } catch (err) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // Public Stream PDF
  app.get("/api/public/documents/:token/pdf", async (req, res) => {
    try {
      const { token } = req.params;
      const docs = await db.select().from(documents).where(eq(documents.token, token));
      if (docs.length === 0) return res.status(404).json({ error: "Not found" });
      
      const doc = docs[0];
      if (doc.status !== "active") {
        return res.status(403).json({ error: "Document unavailable" });
      }
      
      const filePath = path.join(UPLOADS_DIR, doc.storagePath);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "File not found on disk" });
      }
      
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `inline; filename="${doc.originalFilename}"`);
      const stream = fs.createReadStream(filePath);
      stream.pipe(res);
    } catch (err) {
      res.status(500).json({ error: "Server error" });
    }
  });

  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err) {
      res.status(err.status || 500).json({ error: err.message });
    } else {
      next();
    }
  });

  // --- Vite Middleware ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
