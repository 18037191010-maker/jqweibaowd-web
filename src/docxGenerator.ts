import { Document, Packer, Paragraph, TextRun, AlignmentType, Table, TableRow, TableCell, BorderStyle, WidthType, ImageRun, UnderlineType } from "docx";
import { saveAs } from "file-saver";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import ImageModule from "docxtemplater-image-module-free";

// Helper to convert base64 to Uint8Array safely in browser without node buffer dependency
function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = window.atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Helper to download web URLs as Uint8Array asynchronously for custom images
async function fetchImageAsUint8Array(url: string): Promise<Uint8Array | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const buf = await res.arrayBuffer();
    return new Uint8Array(buf);
  } catch (err) {
    console.error("Failed to fetch image:", url, err);
    return null;
  }
}

// Translate web CSS colors into Hex values for Word XML
function colorToHex(color: string): string | null {
  if (!color) return null;
  const cleaned = color.trim();
  if (cleaned.startsWith("#")) {
    return cleaned.replace("#", "");
  }
  const rgbMatch = cleaned.match(/^rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1], 10).toString(16).padStart(2, "0");
    const g = parseInt(rgbMatch[2], 10).toString(16).padStart(2, "0");
    const b = parseInt(rgbMatch[3], 10).toString(16).padStart(2, "0");
    return `${r}${g}${b}`;
  }
  const basicColors: Record<string, string> = {
    red: "FF0000",
    blue: "1D4ED8", // Standard blue
    green: "059669",
    black: "000000",
    white: "FFFFFF",
    gray: "64748B",
  };
  return basicColors[cleaned.toLowerCase()] || null;
}

// Extract rich inline styling runs (styling child elements of tags like <p>, <td>, etc.)
async function parseInlineElements(parent: Node): Promise<any[]> {
  const runs: any[] = [];
  
  async function traverse(node: Node, styles: { bold?: boolean; italic?: boolean; underline?: boolean; color?: string; strike?: boolean } = {}) {
    if (node.nodeType === Node.TEXT_NODE) {
      const textVal = node.textContent;
      if (textVal) {
        runs.push(new TextRun({
          text: textVal,
          bold: styles.bold,
          italics: styles.italic,
          underline: styles.underline ? { type: UnderlineType.SINGLE, color: styles.color } : undefined,
          strike: styles.strike,
          font: "Microsoft YaHei",
          color: styles.color || undefined,
          size: 21, // 10.5pt (Standard 5号字)
        }));
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      const tag = el.tagName;
      
      let nextStyles = { ...styles };
      if (tag === "STRONG" || tag === "B") {
        nextStyles.bold = true;
      }
      if (tag === "EM" || tag === "I") {
        nextStyles.italic = true;
      }
      if (tag === "U") {
        nextStyles.underline = true;
      }
      if (tag === "SPAN" || tag === "FONT") {
        const color = el.style.color;
        if (color) {
          const hex = colorToHex(color);
          if (hex) {
            nextStyles.color = hex;
          }
        }
        
        const td = el.style.textDecoration || "";
        if (td.includes("underline")) {
          nextStyles.underline = true;
        }
        if (td.includes("line-through")) {
          nextStyles.strike = true;
        }
      }
      
      if (tag === "IMG") {
        const src = el.getAttribute("src") || "";
        if (src) {
          let imageBytes: Uint8Array | null = null;
          let ext = "png";
          
          if (src.startsWith("data:image/")) {
            const parts = src.split(",");
            if (parts[1]) {
              try {
                imageBytes = base64ToUint8Array(parts[1]);
                const matched = src.match(/data:image\/([a-zA-Z10-9+]+);base64/);
                ext = matched ? matched[1] : "png";
                if (ext === "jpg") ext = "jpeg";
              } catch (e) {
                console.error("Base64 parsing error:", e);
              }
            }
          } else {
            imageBytes = await fetchImageAsUint8Array(src);
          }
          
          if (imageBytes) {
            const imgEl = el as HTMLImageElement;
            const width = imgEl.width || parseInt(imgEl.style.width, 10) || 120;
            const height = imgEl.height || parseInt(imgEl.style.height, 10) || 60;
            
            runs.push(new ImageRun({
              data: imageBytes,
              transformation: {
                width: width,
                height: height,
              },
              type: ext === "jpg" ? "jpeg" : (ext as any),
            }));
            return;
          }
        }
      }
      
      if (tag === "BR") {
        runs.push(new TextRun({ break: 1 }));
        return;
      }
      
      for (const child of Array.from(el.childNodes)) {
        await traverse(child, nextStyles);
      }
    }
  }
  
  for (const child of Array.from(parent.childNodes)) {
    await traverse(child);
  }
  
  return runs;
}

// Convert HTML Block elements to correct Word elements
async function htmlElementToDocxObjects(element: HTMLElement): Promise<any[]> {
  const tagName = element.tagName;
  const results: any[] = [];
  
  const textAlign = element.style.textAlign || "";
  let alignment: any = AlignmentType.LEFT;
  if (textAlign === "center") {
    alignment = AlignmentType.CENTER;
  } else if (textAlign === "right") {
    alignment = AlignmentType.RIGHT;
  } else if (textAlign === "justify") {
    alignment = AlignmentType.JUSTIFIED;
  }
  
  const lineSpacingVal = 360; // 1.5 spacing
  
  if (/^H[1-6]$/.test(tagName)) {
    const levelNum = parseInt(tagName.charAt(1), 10);
    const size = levelNum === 1 ? 32 : levelNum === 2 ? 26 : 22; // sizes in 1/2 pt
    const inlineRuns = await parseInlineElements(element);
    const headingAlign = (levelNum === 1 && textAlign === "") ? AlignmentType.CENTER : alignment;
    
    results.push(new Paragraph({
      alignment: headingAlign,
      spacing: { before: levelNum === 1 ? 360 : 240, after: 120 },
      keepNext: true,
      children: inlineRuns,
    }));
  } 
  else if (tagName === "TABLE") {
    const rows: TableRow[] = [];
    const trElements = Array.from(element.querySelectorAll("tr"));
    
    for (const tr of trElements) {
      const cells: TableCell[] = [];
      const cellElements = Array.from(tr.children);
      
      for (const cellEl of cellElements) {
        const cell = cellEl as HTMLElement;
        const cellTagName = cell.tagName;
        const cellChildren: Paragraph[] = [];
        const hasP = cell.querySelector("p") !== null;
        
        if (hasP) {
          const pElms = Array.from(cell.querySelectorAll("p"));
          for (const p of pElms) {
            const inlineRuns = await parseInlineElements(p);
            cellChildren.push(new Paragraph({
              spacing: { before: 80, after: 80 },
              children: inlineRuns,
            }));
          }
        } else {
          const inlineRuns = await parseInlineElements(cell);
          cellChildren.push(new Paragraph({
            spacing: { before: 80, after: 80 },
            children: inlineRuns,
          }));
        }
        
        // Header versus ordinary background shading
        const isHeader = cellTagName === "TH";
        const bgHex = isHeader ? "F1F5F9" : undefined;
        
        cells.push(new TableCell({
          borders: {
            top: { style: BorderStyle.SINGLE, size: 8, color: "475569" },
            bottom: { style: BorderStyle.SINGLE, size: 8, color: "475569" },
            left: { style: BorderStyle.SINGLE, size: 8, color: "475569" },
            right: { style: BorderStyle.SINGLE, size: 8, color: "475569" },
          },
          shading: bgHex ? { fill: bgHex } : undefined,
          children: cellChildren,
        }));
      }
      
      if (cells.length > 0) {
        rows.push(new TableRow({ children: cells }));
      }
    }
    
    if (rows.length > 0) {
      results.push(new Table({
        width: {
          size: 100,
          type: WidthType.PERCENTAGE,
        },
        rows: rows,
      }));
    }
  } 
  else if (tagName === "UL" || tagName === "OL") {
    const listItems = Array.from(element.querySelectorAll("li"));
    for (let i = 0; i < listItems.length; i++) {
      const li = listItems[i];
      const inlineRuns = await parseInlineElements(li);
      
      const p = new Paragraph({
        indent: { left: 432 }, 
        spacing: { before: 80, after: 80 },
        children: [
          new TextRun({
            text: tagName === "UL" ? "• " : `${i + 1}. `,
            bold: true,
            font: "Microsoft YaHei",
            size: 21,
          }),
          ...inlineRuns,
        ],
      });
      results.push(p);
    }
  } 
  else if (tagName === "LI") {
    const inlineRuns = await parseInlineElements(element);
    results.push(new Paragraph({
      indent: { left: 432 },
      spacing: { before: 80, after: 80 },
      children: [
        new TextRun({
          text: "• ",
          bold: true,
          font: "Microsoft YaHei",
          size: 21,
        }),
        ...inlineRuns,
      ],
    }));
  }
  else if (tagName === "P") {
    const inlineRuns = await parseInlineElements(element);
    const textStr = element.textContent || "";
    
    // Standard indent for paragraphs if left-aligned and not signature block
    const isSignature = textStr.includes("______") || textStr.includes("（盖章）") || textStr.includes("本人签章") || textStr.includes("签名") || (textStr.length < 20 && textStr.includes("："));
    const needsIndent = !isSignature && alignment === AlignmentType.LEFT;
    
    results.push(new Paragraph({
      alignment: alignment,
      indent: needsIndent ? { firstLine: 432 } : undefined, // 2 characters standard Chinese indentation
      spacing: { before: 120, after: 120, line: lineSpacingVal },
      children: inlineRuns,
    }));
  }
  else {
    const childEls = Array.from(element.children);
    if (childEls.length > 0) {
      for (const child of childEls) {
        const parsed = await htmlElementToDocxObjects(child as HTMLElement);
        results.push(...parsed);
      }
    } else {
      const inlineRuns = await parseInlineElements(element);
      if (inlineRuns.length > 0) {
        results.push(new Paragraph({
          alignment: alignment,
          spacing: { before: 120, after: 120, line: lineSpacingVal },
          children: inlineRuns,
        }));
      }
    }
  }
  
  return results;
}

/**
 * Generates a polished Microsoft Word (.docx) document from raw styled text
 * or compiled high-fidelity HTML and triggers a browser download.
 */
export async function generateAndDownloadDocx(
  title: string, 
  fullCompiledContent: string, 
  htmlContent?: string,
  docxBase64?: string,
  values?: Record<string, string>,
  contentTemplate?: string
) {
  // If we have direct base64 DOCX data and active form values,
  // we perform 100% high-fidelity docxtemplater substitute filling
  if (docxBase64 && values) {
    try {
      const binaryString = window.atob(docxBase64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const zip = new PizZip(bytes);

      // Direct media image file replacements for keys that represent docx ZIP paths
      Object.keys(values).forEach((key) => {
        const val = values[key];
        if (key.startsWith("word/media/") && val && val.startsWith("data:image/")) {
          const base64Part = val.split(",")[1];
          if (base64Part) {
            const imageBytes = base64ToUint8Array(base64Part);
            zip.file(key, imageBytes, { binary: true });
            console.log(`Replaced media image directly in zip at path: ${key}`);
          }
        }
      });

      // Detect delimiters style: single or double curly brackets
      const hasDouble = contentTemplate 
        ? contentTemplate.includes("{{") 
        : (fullCompiledContent.includes("{{") || (htmlContent && htmlContent.includes("{{")));
      const docxDelimiters = hasDouble ? { start: "{{", end: "}}" } : { start: "{", end: "}" };

      // Find all keys in values that are base64 images
      const imageKeys: string[] = [];
      Object.keys(values).forEach((key) => {
        const val = values[key];
        if (val && val.startsWith("data:image/")) {
          imageKeys.push(key);
        }
      });

      // Preprocess ZIP XML files to replace {{key}} or {key} with {{%key}} or {%key} so docxtemplater image module can parse them
      Object.keys(zip.files).forEach((filePath) => {
        if (filePath.endsWith(".xml")) {
          let xmlText = zip.files[filePath].asText();
          let changed = false;
          imageKeys.forEach((key) => {
            const chars = key.split("");
            const escapePattern = chars.map(c => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join("(<[^>]+>)*");
            const regexStr = hasDouble
              ? "\\{(<[^>]+>)*\\{(<[^>]+>)*\\s*(<[^>]+>)*" + escapePattern + "\\s*(<[^>]+>)*\\}(<[^>]+>)*\\}"
              : "\\{(<[^>]+>)*\\s*(<[^>]+>)*" + escapePattern + "\\s*(<[^>]+>)*\\}";
            const regex = new RegExp(regexStr, "gi");
            if (regex.test(xmlText)) {
              const replacementVal = hasDouble ? `<w:t>{{%${key}}}</w:t>` : `<w:t>{%${key}}</w:t>`;
              xmlText = xmlText.replace(regex, replacementVal);
              changed = true;
            }
          });
          if (changed) {
            zip.file(filePath, xmlText);
          }
        }
      });

      // Prepare translation data map for DOCX placeholders replacement
      const data: Record<string, any> = {};
      Object.keys(values).forEach((key) => {
        const val = values[key];
        if (val && val.trim() !== "") {
          if (val.startsWith("data:image/")) {
            // Pass raw base64 string for ImageModule
            data[key] = val;
            data[`%${key}`] = val;
          } else {
            data[key] = val;
          }
        } else {
          data[key] = `【待填写: ${key}】`;
        }
      });

      // Initialize the free ImageModule
      const imageModule = new ImageModule({
        centered: false,
        fileType: "docx",
        getImage: (tagValue: string) => {
          if (tagValue && tagValue.startsWith("data:image/")) {
            const base64Part = tagValue.split(",")[1] || tagValue;
            return base64ToUint8Array(base64Part);
          }
          return base64ToUint8Array(tagValue);
        },
        getSize: (img: any, tagValue: string, tagName: string) => {
          const lowerName = tagName.toLowerCase();
          if (lowerName.includes("seal") || lowerName.includes("stamp") || lowerName.includes("章")) {
            return [120, 120];
          }
          return [140, 75]; // signature/other images
        }
      });

      const doc = new Docxtemplater(zip, {
        delimiters: docxDelimiters,
        paragraphLoop: true,
        linebreaks: true,
        modules: [imageModule]
      });

      doc.render(data);

      const out = doc.getZip().generate({
        type: "blob",
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });

      const cleanFileName = title.replace(/[\\/:*?"<>|]/g, "_") + ".docx";
      saveAs(out, cleanFileName);
      return; // Stop and successfully exit!
    } catch (err) {
      console.error("Direct docxtemplater high-fidelity filling failed, continuing with fallback:", err);
    }
  }

  let paragraphs: any[] = [];

  // 1. High-fidelity HTML parsing if supplied
  if (htmlContent) {
    try {
      const parser = new DOMParser();
      
      // Clean up interactive highlights from compiledHtmlContent for neat Word export
      let cleanedHtml = htmlContent;
      // Convert reactive highlight tag formats back to elegant clean spans
      cleanedHtml = cleanedHtml.replace(/<strong style="color: #1d4ed8;[^>]*>(.*?)<\/strong>/gi, "<strong>$1</strong>");
      cleanedHtml = cleanedHtml.replace(/<span class="animate-pulse"[^>]*>\[待填写: (.*?)\]<\/span>/gi, "<u>【待填写: $1】</u>");

      const docEl = parser.parseFromString(cleanedHtml, "text/html");
      const bodyElements = Array.from(docEl.body.children);
      
      for (const el of bodyElements) {
        const docxObjs = await htmlElementToDocxObjects(el as HTMLElement);
        paragraphs.push(...docxObjs);
      }
    } catch (err) {
      console.error("High-fidelity HTML MS Word parsing failed, falling back to plaintext:", err);
      paragraphs = []; // Trigger plaintext fallback
    }
  }

  // 2. Playback fallback to line-based parsing if no HTML or parsing failed or empty
  if (paragraphs.length === 0) {
    const lines = fullCompiledContent.split("\n");
    
    lines.forEach((line, index) => {
      let trimmedLine = line.trim();
      
      // Replace any leftover double-brace placeholders
      trimmedLine = trimmedLine.replace(/\{\{([a-zA-Z0-9_-]+)\}\}/g, (_, key) => {
        return `【待填写: ${key}】`;
      });

      // Simple structure mappings
      if (index === 0 || (index < 3 && (trimmedLine.includes("合同") || trimmedLine.includes("单") || trimmedLine.includes("书") || trimmedLine.includes("纪要") || trimmedLine.includes("周报") || trimmedLine.includes("契约")))) {
        paragraphs.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 360, after: 240 },
            children: [
              new TextRun({
                text: trimmedLine,
                bold: true,
                size: 36, // 18pt
                font: "Microsoft YaHei",
              }),
            ],
          })
        );
        return;
      }

      const isHeading = /^(第[一二三四五六七八九十]+条|第[一二三四五六七八九十]+章|[一二三四五六七八九十\d]+\s*、)/.test(trimmedLine);
      if (isHeading) {
        paragraphs.push(
          new Paragraph({
            spacing: { before: 240, after: 120 },
            keepNext: true,
            children: [
              new TextRun({
                text: trimmedLine,
                bold: true,
                size: 26, // 13pt
                font: "Microsoft YaHei",
              }),
            ],
          })
        );
        return;
      }

      const isBullet = trimmedLine.startsWith("-") || trimmedLine.startsWith("*") || trimmedLine.startsWith("•");
      if (isBullet) {
        const cleanText = trimmedLine.replace(/^[-*•]\s*/, "");
        paragraphs.push(
          new Paragraph({
            indent: { left: 432 },
            spacing: { before: 80, after: 80 },
            children: [
              new TextRun({
                text: "• " + cleanText,
                font: "Microsoft YaHei",
                size: 21,
              }),
            ],
          })
        );
        return;
      }

      if (trimmedLine === "") {
        paragraphs.push(
          new Paragraph({
            spacing: { before: 120, after: 120 },
            children: [new TextRun({ text: "" })],
          })
        );
        return;
      }

      const isSignature = trimmedLine.includes("______") || trimmedLine.includes("（盖章）") || trimmedLine.includes("签名") || (trimmedLine.length < 20 && trimmedLine.includes("："));
      if (isSignature) {
        paragraphs.push(
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            spacing: { before: 240, after: 120 },
            children: [
              new TextRun({
                text: trimmedLine,
                bold: true,
                font: "Microsoft YaHei",
                size: 21,
              }),
            ],
          })
        );
        return;
      }

      paragraphs.push(
        new Paragraph({
          indent: { firstLine: 432 }, // 2 characters standard Chinese indentation
          spacing: { before: 120, after: 120, line: 360 }, // 1.5 line spacing (360 dxa)
          children: [
            new TextRun({
              text: trimmedLine,
              font: "Microsoft YaHei",
              size: 21, // 10.5pt (Standard 5号字)
            }),
          ],
        })
      );
    });
  }

  // Create Word document packaging
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440, // 1 inch = 1440 dxa
              bottom: 1440,
              left: 1440,
              right: 1440,
            },
          },
        },
        children: paragraphs,
      },
    ],
  });

  // Pack and save
  const blob = await Packer.toBlob(doc);
  const cleanFileName = title.replace(/[\\/:*?"<>|]/g, "_") + ".docx";
  saveAs(blob, cleanFileName);
}
