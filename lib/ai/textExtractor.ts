import pdfParse from "pdf-parse";
import mammoth from "mammoth";
import { XMLParser } from "fast-xml-parser";

const FILE_TYPE_MAP: Record<string, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  fdx: "application/xml",
};

const MIME_TO_TYPE: Record<string, "pdf" | "docx" | "fdx"> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/xml": "fdx",
  "text/xml": "fdx",
  "application/final-draft": "fdx",
};

function normalizeFileType(fileType: string): "pdf" | "docx" | "fdx" {
  const trimmed = fileType.toLowerCase().trim();
  const mimeMatch = MIME_TO_TYPE[trimmed];
  if (mimeMatch) {
    return mimeMatch;
  }

  const ext = trimmed.replace(/^\./, "");
  if (ext in FILE_TYPE_MAP) {
    return ext as "pdf" | "docx" | "fdx";
  }

  if (trimmed.includes("pdf")) return "pdf";
  if (trimmed.includes("docx")) return "docx";
  if (trimmed.includes("fdx") || trimmed.includes("final draft")) return "fdx";

  throw new Error(
    `Desteklenmeyen dosya türü: ${fileType}. Lütfen PDF, DOCX veya FDX yükleyin.`
  );
}

function extractTextFromFdx(xmlContent: string): string {
  const parser = new XMLParser({ ignoreAttributes: false, textNodeName: "text" });
  const parsed = parser.parse(xmlContent);

  const texts: string[] = [];

  const visit = (node: unknown) => {
    if (typeof node === "string") {
      const value = node.trim();
      if (value) {
        texts.push(value);
      }
      return;
    }

    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }

    if (node && typeof node === "object") {
      Object.values(node).forEach(visit);
    }
  };

  visit(parsed);

  return texts.join("\n");
}

export async function extractTextFromScriptFile(
  buffer: ArrayBuffer,
  fileType: string
): Promise<string> {
  const normalized = normalizeFileType(fileType);
  const fileBuffer = Buffer.from(buffer);

  if (!fileBuffer.length) {
    throw new Error("Dosya içeriği boş görünüyor. Lütfen geçerli bir dosya yükleyin.");
  }

  try {
    if (normalized === "pdf") {
      const parsed = await pdfParse(fileBuffer);
      const text = parsed.text.trim();
      if (!text) {
        throw new Error("PDF dosyasından metin çıkarılamadı.");
      }
      return text;
    }

    if (normalized === "docx") {
      const { value } = await mammoth.extractRawText({ buffer: fileBuffer });
      const text = value.trim();
      if (!text) {
        throw new Error("DOCX dosyasından metin çıkarılamadı.");
      }
      return text;
    }

    const xmlContent = fileBuffer.toString("utf-8");
    const text = extractTextFromFdx(xmlContent);
    if (!text) {
      throw new Error("FDX dosyasından metin çıkarılamadı.");
    }
    return text;
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Dosya metnini çıkarırken beklenmeyen bir hata oluştu.";
    throw new Error(message);
  }
}
