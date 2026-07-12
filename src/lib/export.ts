import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";
import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";
import { isTauri } from "./tauri";

function dataUrlToUint8(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(",")[1] ?? "";
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function safeFileName(name: string): string {
  return name.replace(/[^a-z0-9\-_ ]/gi, "").trim().replace(/\s+/g, "-") || "shortcuts";
}

async function snapshot(node: HTMLElement): Promise<string> {
  return toPng(node, {
    backgroundColor: "#ffffff",
    pixelRatio: 2,
    cacheBust: true,
    // Capture the full node even if it overflows the preview container.
    width: node.scrollWidth,
    height: node.scrollHeight,
    style: { margin: "0", transform: "none" },
  });
}

/**
 * Export a single app's cheat sheet as a PNG. The file is chosen via the Tauri
 * save dialog and written with the fs plugin — fully offline, no network calls.
 */
export async function exportShortcutPng(node: HTMLElement, appName: string): Promise<void> {
  const dataUrl = await snapshot(node);
  const fileName = `${safeFileName(appName)}-shortcuts.png`;

  if (isTauri()) {
    const path = await save({
      defaultPath: fileName,
      filters: [{ name: "PNG Image", extensions: ["png"] }],
    });
    if (!path) return;
    await writeFile(path, dataUrlToUint8(dataUrl));
  } else {
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = fileName;
    a.click();
  }
}

/**
 * Export a single app's cheat sheet as a multi-page PDF (one continuous image
 * sliced across A4 pages so long lists are never cut off).
 */
export async function exportShortcutPdf(node: HTMLElement, appName: string): Promise<void> {
  const dataUrl = await snapshot(node);

  const img = new Image();
  img.src = dataUrl;
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Failed to render export image"));
  });

  const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 24;

  const imgWidth = pageWidth - margin * 2;
  const imgHeight = (img.height * imgWidth) / img.width;

  const fileName = `${safeFileName(appName)}-shortcuts.pdf`;

  const renderPages = () => {
    let heightLeft = imgHeight;
    let position = margin;
    pdf.addImage(dataUrl, "PNG", margin, position, imgWidth, imgHeight);
    heightLeft -= pageHeight - margin * 2;
    while (heightLeft > 0) {
      pdf.addPage();
      position = margin - (imgHeight - heightLeft);
      pdf.addImage(dataUrl, "PNG", margin, position, imgWidth, imgHeight);
      heightLeft -= pageHeight - margin * 2;
    }
  };

  if (isTauri()) {
    const path = await save({
      defaultPath: fileName,
      filters: [{ name: "PDF Document", extensions: ["pdf"] }],
    });
    if (!path) return;
    renderPages();
    const out = pdf.output("arraybuffer");
    await writeFile(path, new Uint8Array(out));
  } else {
    renderPages();
    pdf.save(fileName);
  }
}
