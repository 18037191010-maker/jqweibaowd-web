import React, { useState, useEffect, useMemo, useRef } from "react";
import { DocumentTemplate } from "../types";
import { generateAndDownloadDocx } from "../docxGenerator";
import { Download, Printer, Copy, Edit2, Check, FileText, CheckCircle, Upload } from "lucide-react";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";

interface DocumentViewerProps {
  template: DocumentTemplate;
  values: Record<string, string>;
}

export default function DocumentViewer({ template, values }: DocumentViewerProps) {
  const [isFreeEditing, setIsFreeEditing] = useState(false);
  const [freeEditText, setFreeEditText] = useState("");
  const [copied, setCopied] = useState(false);
  const [estimatedPages, setEstimatedPages] = useState(1);
  const [trueDocxPageCount, setTrueDocxPageCount] = useState<number | null>(null);
  
  // Real-time compilation of original word file buffer
  const [highFidelityArrayBuffer, setHighFidelityArrayBuffer] = useState<ArrayBuffer | null>(null);
  const [docxRenderError, setDocxRenderError] = useState<string | null>(null);
  const [isRenderingDocx, setIsRenderingDocx] = useState(false);

  const previewScrollContainerRef = useRef<HTMLDivElement>(null);
  const [zoomFactor, setZoomFactor] = useState(1);

  // Dynamically calculate scale factor so that high fidelity A4 page fits exactly in the container
  useEffect(() => {
    if (!previewScrollContainerRef.current) return;
    const updateZoom = () => {
      const el = previewScrollContainerRef.current;
      if (!el) return;
      const containerWidth = el.getBoundingClientRect().width;
      // Subtract margins/padding (e.g., 64px total for p-8 on both sides)
      const availableWidth = containerWidth - 64;
      const targetWidth = 794; // Standard pixel width of A4 page
      if (availableWidth < targetWidth && availableWidth > 0) {
        setZoomFactor(availableWidth / targetWidth);
      } else {
        setZoomFactor(1);
      }
    };

    updateZoom();

    const resizeObserver = new ResizeObserver(() => {
      updateZoom();
    });
    resizeObserver.observe(previewScrollContainerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [template.docxBase64]);

  // Compile template text based on active values
  const compiledContent = useMemo(() => {
    let text = template.contentTemplate;
    template.fields.forEach((field) => {
      if (field.type === "image") {
        // Leave image placeholders untouched so that they can be replaced by real images in renderFormattedPreview
        return;
      }
      const userValue = values[field.key];
      // If user provided a value, replace the tag. Otherwise show placeholding text
      const replacement = userValue && userValue.trim() !== "" 
        ? userValue 
        : `[待填写: ${field.label}]`;
      text = text.replaceAll(`{{${field.key}}}`, replacement);
      text = text.replaceAll(`{${field.key}}`, replacement);
    });
    return text;
  }, [template, values]);

  // Compile the high-fidelity HTML content if available (for Word docx templates)
  const compiledHtmlContent = useMemo(() => {
    if (!template.htmlTemplate) return null;
    
    let html = template.htmlTemplate;
    
    template.fields.forEach((field) => {
      const userValue = values[field.key];
      const hasValue = userValue && userValue.trim() !== "";
      
      if (field.type === "image") {
        let replacementHtml = "";
        if (hasValue) {
          replacementHtml = `<span class="inline-block align-middle mx-1 my-1" style="display: inline-block; vertical-align: middle;">
            <img src="${userValue}" alt="${field.label}" style="max-height: 80px; max-width: 140px; object-fit: contain; border: 1px solid #cbd5e1; border-radius: 4px; box-shadow: 0 1px 2px 0 rgba(0,0,0,0.05); display: inline-block; vertical-align: middle;" />
          </span>`;
        } else {
          replacementHtml = `<span class="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-dashed border-amber-300 rounded px-2 py-0.5 text-[10px] font-bold align-middle mx-1 select-none animate-pulse" style="display: inline-block; line-height: normal; font-family: sans-serif; border: 1px dashed #fcd34d; background-color: #fef3c7; color: #b45309; border-radius: 4px; padding: 2px 6px; font-size: 10px; font-weight: bold; vertical-align: middle;">
            📸 [待载入图片: ${field.label}]
          </span>`;
        }
        // Match both plain key and curly brace wrappers
        html = html.replaceAll(`{{${field.key}}}`, replacementHtml);
        html = html.replaceAll(`{${field.key}}`, replacementHtml);
        html = html.replaceAll(field.key, replacementHtml);
      } else {
        const replacementText = hasValue 
          ? `<strong style="color: #1d4ed8; font-weight: bold; text-decoration: underline; background-color: rgba(239, 246, 255, 0.4); padding: 0 2px;">${userValue}</strong>`
          : `<span class="animate-pulse" style="background-color: #fff1f2; color: #e11d48; font-weight: bold; border: 1px solid #fecdd3; border-radius: 4px; padding: 1px 4px; font-size: 10px; display: inline-block;">[待填写: ${field.label}]</span>`;
        
        html = html.replaceAll(`{{${field.key}}}`, replacementText);
        html = html.replaceAll(`{${field.key}}`, replacementText);
      }
    });
    
    return html;
  }, [template, values]);

  // Synchronize free-form text with compiled text upon template or values change
  useEffect(() => {
    setFreeEditText(compiledContent);
  }, [compiledContent]);

  // Real-time filling of the uploaded docx using docxtemplater inside the web browser
  useEffect(() => {
    if (!template.docxBase64) {
      setHighFidelityArrayBuffer(null);
      return;
    }

    let isMounted = true;
    setIsRenderingDocx(true);

    try {
      const binaryString = window.atob(template.docxBase64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const zip = new PizZip(bytes);

      // Direct media image file replacements for live preview of ZIP-based replacement fields
      Object.keys(values).forEach((key) => {
        const val = values[key];
        if (key.startsWith("word/media/") && val && val.startsWith("data:image/")) {
          const base64Part = val.split(",")[1];
          if (base64Part) {
            const binaryImg = window.atob(base64Part);
            const imgBytes = new Uint8Array(binaryImg.length);
            for (let i = 0; i < binaryImg.length; i++) {
              imgBytes[i] = binaryImg.charCodeAt(i);
            }
            zip.file(key, imgBytes, { binary: true });
          }
        }
      });

      // Detect delimiters style: single or double curly brackets
      const hasDouble = template.contentTemplate.includes("{{") || (template.htmlTemplate && template.htmlTemplate.includes("{{"));
      const docxDelimiters = hasDouble ? { start: "{{", end: "}}" } : { start: "{", end: "}" };

      const doc = new Docxtemplater(zip, {
        delimiters: docxDelimiters,
        paragraphLoop: true,
        linebreaks: true,
      });

      // Prepare translation data map for DOCX placeholders replacement
      const data: Record<string, any> = {};
      template.fields.forEach((field) => {
        if (field.key.startsWith("word/media/")) {
          // Media fields are directly updated as file bytes, no text tag mapping
          return;
        }
        const val = values[field.key];
        if (field.type === "image") {
          if (val && val.trim() !== "" && val.startsWith("data:image/")) {
            data[field.key] = `__INSERTED_IMAGE_MARKER__::${field.key}::${val}`;
          } else {
            data[field.key] = `__EMPTY_IMAGE_MARKER__::${field.key}::${field.label}`;
          }
        } else {
          if (val && val.trim() !== "") {
            data[field.key] = val;
          } else {
            data[field.key] = `【待填写: ${field.label}】`;
          }
        }
      });

      doc.render(data);

      const out = doc.getZip().generate({
        type: "arraybuffer"
      });

      if (isMounted) {
        setHighFidelityArrayBuffer(out);
        setDocxRenderError(null);
      }
    } catch (err: any) {
      console.error("Docxtemplater filling for live preview failed:", err);
      if (isMounted) {
        setDocxRenderError(err.message || "文档高保真参数替换失败");
      }
    } finally {
      if (isMounted) {
        setIsRenderingDocx(false);
      }
    }

    return () => {
      isMounted = false;
    };
  }, [template.docxBase64, template.fields, values]);

  // Multi-page layout calculations for the default fallback standard text templates
  const paginatedPages = useMemo(() => {
    const content = isFreeEditing ? freeEditText : compiledContent;
    const lines = content.split("\n");
    const pages: string[][] = [[]];
    let currentLineCount = 0;
    const linesPerPage = 22; // safe amount of lines per A4 screen page

    lines.forEach((line) => {
      const trimmed = line.trim();
      const lineWeight = Math.max(1, Math.ceil(trimmed.length / 42));
      
      if (currentLineCount + lineWeight > linesPerPage) {
        pages.push([]);
        currentLineCount = 0;
      }
      
      pages[pages.length - 1].push(line);
      currentLineCount += lineWeight;
    });

    return pages;
  }, [isFreeEditing, freeEditText, compiledContent]);

  // Monitor DOM rendered height to accurately estimate equivalent standard A4 pages
  useEffect(() => {
    const timer = setTimeout(() => {
      const el = document.getElementById("printable-document");
      if (el) {
        const sh = el.scrollHeight;
        const pageHeight = 1100;
        const pages = Math.max(1, Math.ceil(sh / pageHeight));
        setEstimatedPages(pages);
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [template, values, compiledContent, compiledHtmlContent, isFreeEditing, freeEditText]);

  const handleCopy = async () => {
    const textToCopy = isFreeEditing ? freeEditText : compiledContent;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Clipboard copy failed: ", err);
    }
  };

  const handleExportWord = async () => {
    const textToExport = isFreeEditing ? freeEditText : compiledContent;
    await generateAndDownloadDocx(
      template.title, 
      textToExport, 
      isFreeEditing ? undefined : (compiledHtmlContent || undefined),
      isFreeEditing ? undefined : template.docxBase64,
      isFreeEditing ? undefined : values,
      isFreeEditing ? undefined : template.contentTemplate
    );
  };

  const handlePrint = () => {
    window.print();
  };

  const liveDocxContainerRef = useRef<HTMLDivElement>(null);

  // docx-preview live rendering
  useEffect(() => {
    if (highFidelityArrayBuffer && liveDocxContainerRef.current) {
      const container = liveDocxContainerRef.current;
      container.innerHTML = `
        <div class="flex flex-col items-center justify-center p-12 text-center text-slate-500 font-sans">
          <svg class="animate-spin h-6 w-6 text-blue-600 mb-2" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span class="text-xs font-bold text-slate-700">正在生成高保真 Word 渲染排版...</span>
        </div>
      `;
      
      import("docx-preview").then(({ renderAsync }) => {
        if (liveDocxContainerRef.current) {
          liveDocxContainerRef.current.innerHTML = "";
          renderAsync(highFidelityArrayBuffer, liveDocxContainerRef.current, undefined, {
            inWrapper: true,
            ignoreWidth: false,
            ignoreHeight: false,
            breakPages: true,
            experimental: true,
            className: "docx-rendered-page-preview"
          }).then(() => {
            console.log("High-fidelity live preview rendered successfully!");
            if (liveDocxContainerRef.current) {
              const pages = liveDocxContainerRef.current.querySelectorAll(".docx-rendered-page-preview");
              setTrueDocxPageCount(pages.length || 1);

              // Inline custom images inside the rendered page DOM by walking text nodes
              const walker = document.createTreeWalker(
                liveDocxContainerRef.current,
                NodeFilter.SHOW_TEXT
              );
              const textNodes: { node: Text; text: string }[] = [];
              while (walker.nextNode()) {
                const node = walker.currentNode as Text;
                const val = node.nodeValue || "";
                if (val.includes("__INSERTED_IMAGE_MARKER__") || val.includes("__EMPTY_IMAGE_MARKER__")) {
                  textNodes.push({ node, text: val });
                }
              }

              textNodes.forEach(({ node, text }) => {
                const parent = node.parentNode;
                if (!parent) return;

                if (text.includes("__INSERTED_IMAGE_MARKER__")) {
                  const parts = text.split("__INSERTED_IMAGE_MARKER__::");
                  if (parts.length > 1) {
                    const payload = parts[1];
                    const nextParts = payload.split("::");
                    const key = nextParts[0];
                    const base64 = nextParts[1];

                    const img = document.createElement("img");
                    img.src = base64;
                    img.alt = key;
                    img.className = "custom-replaced-image";
                    
                    const isSeal = key.toLowerCase().includes("seal") || key.toLowerCase().includes("stamp") || key.toLowerCase().includes("章");
                    if (isSeal) {
                      img.style.maxHeight = "95px";
                      img.style.maxWidth = "95px";
                    } else {
                      img.style.maxHeight = "60px";
                      img.style.maxWidth = "115px";
                    }
                    
                    img.style.display = "inline-block";
                    img.style.verticalAlign = "middle";
                    img.style.objectFit = "contain";
                    img.style.margin = "4px";
                    img.style.padding = "2px";
                    img.style.backgroundColor = "transparent";
                    img.style.border = "1px dashed rgba(239, 68, 68, 0.4)";
                    img.style.borderRadius = "4px";

                    parent.replaceChild(img, node);
                  }
                } else if (text.includes("__EMPTY_IMAGE_MARKER__")) {
                  const parts = text.split("__EMPTY_IMAGE_MARKER__::");
                  if (parts.length > 1) {
                    const payload = parts[1];
                    const nextParts = payload.split("::");
                    const label = nextParts[1] || nextParts[0];

                    const badge = document.createElement("span");
                    badge.innerText = `📸 [待载入: ${label}]`;
                    badge.className = "inline-block px-2 py-0.5 text-[10px] font-bold text-amber-700 bg-amber-50 border border-dashed border-amber-300 rounded mx-1 align-middle whitespace-nowrap";
                    
                    parent.replaceChild(badge, node);
                  }
                }
              });
            }
          }).catch(err => {
            console.error("docx-preview failed for live preview:", err);
            if (liveDocxContainerRef.current) {
              liveDocxContainerRef.current.innerHTML = `
                <div class="p-6 text-center text-rose-500 font-sans text-xs">
                  <p class="font-bold">微软 Word高保真视图渲染失败</p>
                  <p class="text-[10px] text-slate-500 mt-1">原因: ${err.message || err}</p>
                </div>
              `;
            }
          });
        }
      }).catch(err => {
        console.error("Failed to load docx-preview:", err);
      });
    }
  }, [highFidelityArrayBuffer]);

  // Render HTML preview or styled pages inside the web browser
  const renderFormattedPreview = () => {
    // 1. High-fidelity dynamic in-browser DOCX preview
    if (template.docxBase64) {
      return (
        <div className="w-full flex justify-center items-start overflow-visible">
          <div 
            className="w-full flex flex-col gap-1 word-high-fidelity-component-view"
            style={{
              width: "794px",
              minWidth: "794px",
              zoom: zoomFactor,
            }}
          >
            <style dangerouslySetInnerHTML={{ __html: `
              .word-high-fidelity-component-view .docx-wrapper {
                background: transparent !important;
                padding: 0 !important;
                display: flex !important;
                flex-direction: column !important;
                align-items: center !important;
                width: 100% !important;
              }
              .word-high-fidelity-component-view .docx-wrapper > section {
                background: white !important;
                box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1) !important;
                border: 1px solid #e2e8f0 !important;
                margin: 0 auto 1.5rem auto !important;
                width: 794px !important;
                height: 1123px !important;
                box-sizing: border-box !important;
                position: relative !important;
                overflow: hidden !important;
                display: flex !important;
                flex-direction: column !important;
              }
              .word-high-fidelity-component-view .docx-wrapper > section::after {
                content: "微软 Word 官方高保真预览 - A4 分页";
                position: absolute;
                bottom: 1.5rem;
                right: 4rem;
                font-size: 8px;
                color: #94a3b8;
                font-family: sans-serif;
                pointer-events: none;
              }
              /* Prevent non-absolute images from overstretching vertically or horizontally */
              .word-high-fidelity-component-view img:not(.custom-replaced-image) {
                max-width: 100% !important;
              }
              .word-high-fidelity-component-view img.custom-replaced-image {
                display: inline-block !important;
                vertical-align: middle !important;
                object-fit: contain !important;
                background-color: transparent !important;
                border: 1px dashed rgba(239, 68, 68, 0.4) !important;
                border-radius: 4px !important;
                box-sizing: border-box !important;
              }
              /* Ensure tables automatically auto-fit parent containers */
              .word-high-fidelity-component-view table {
                width: 100% !important;
                max-width: 100% !important;
                table-layout: auto !important;
                border-collapse: collapse !important;
                margin: 1.5rem 0 !important;
              }
              .word-high-fidelity-component-view td,
              .word-high-fidelity-component-view th {
                word-break: break-word !important;
                word-wrap: break-word !important;
                overflow-wrap: break-word !important;
                white-space: normal !important;
                padding: 6px 8px !important;
              }
              .word-high-fidelity-component-view p,
              .word-high-fidelity-component-view section,
              .word-high-fidelity-component-view h1,
              .word-high-fidelity-component-view h2,
              .word-high-fidelity-component-view h3 {
                clear: both !important;
                word-break: break-word !important;
              }
            `}} />
            <div ref={liveDocxContainerRef} className="w-full" />
          </div>
        </div>
      );
    }

    // 2. High-fidelity static HTML preview fallback (Mammoth output)
    if (template.htmlTemplate && compiledHtmlContent) {
      return (
        <div className="bg-white max-w-3xl w-full min-h-[1100px] shadow-2xl border border-slate-200/80 p-8 sm:p-12 md:p-14 pb-24 relative overflow-visible transition-all duration-300">
          <div className="font-sans text-slate-800 leading-relaxed text-xs pb-10 mammoth-preview">
            <style dangerouslySetInnerHTML={{ __html: `
              .mammoth-preview h1 {
                font-size: 1.65rem !important;
                text-align: center !important;
                margin-top: 1.5rem !important;
                margin-bottom: 1.5rem !important;
                font-weight: bold !important;
                color: #0f172a !important;
              }
              .mammoth-preview h2 {
                font-size: 1.3rem !important;
                font-weight: bold !important;
                margin-top: 1.25rem !important;
                margin-bottom: 0.75rem !important;
                color: #1e293b !important;
              }
              .mammoth-preview h3 {
                font-size: 1.1rem !important;
                font-weight: bold !important;
                margin-top: 1rem !important;
                margin-bottom: 0.50rem !important;
                color: #334155 !important;
              }
              .mammoth-preview table {
                width: 100% !important;
                border-collapse: collapse !important;
                margin: 1.5rem 0 !important;
                box-sizing: border-box !important;
              }
              .mammoth-preview th, .mammoth-preview td {
                border: 1px solid #475569 !important;
                padding: 0.60rem 0.85rem !important;
                text-align: left;
                vertical-align: middle;
                line-height: 1.6 !important;
                word-break: break-word !important;
                word-wrap: break-word !important;
                overflow-wrap: break-word !important;
              }
              .mammoth-preview th {
                background-color: #f1f5f9 !important;
                font-weight: bold !important;
              }
              .mammoth-preview img {
                max-width: 100% !important;
                height: auto !important;
                max-height: 480px !important;
                object-fit: contain !important;
                display: block !important;
                margin: 1.5rem auto !important;
              }
              .mammoth-preview p {
                margin-bottom: 0.85rem !important;
                text-align: justify !important;
                line-height: 1.8 !important;
                text-indent: 2em;
              }
              .mammoth-preview td p, 
              .mammoth-preview th p, 
              .mammoth-preview h1 p, 
              .mammoth-preview h2 p, 
              .mammoth-preview h3 p, 
              .mammoth-preview h4 p,
              .mammoth-preview li p {
                text-indent: 0 !important;
                margin-bottom: 0 !important;
              }
              .mammoth-preview ul {
                list-style-type: disc !important;
                padding-left: 1.5rem !important;
                margin-bottom: 0.75rem !important;
              }
              .mammoth-preview ol {
                list-style-type: decimal !important;
                padding-left: 1.5rem !important;
                margin-bottom: 0.75rem !important;
              }
              .mammoth-preview li {
                margin-bottom: 0.35rem !important;
                line-height: 1.7 !important;
              }
            ` }} />
            <div dangerouslySetInnerHTML={{ __html: compiledHtmlContent }} />
          </div>
        </div>
      );
    }

    // 3. Multi-page layout fallback for standard templates
    return (
      <div className="flex flex-col gap-6 items-center w-full">
        {paginatedPages.map((pageLines, pageIdx) => (
          <div 
            key={pageIdx} 
            className="bg-white max-w-3xl w-full aspect-[210/297] shadow-lg border border-slate-200 p-8 sm:p-12 relative flex flex-col justify-between overflow-hidden"
          >
            <div className="font-sans text-slate-800 leading-relaxed text-xs">
              {/* Header inside each page */}
              {pageIdx === 0 && (
                <div className="border-b-2 border-slate-800 pb-4 mb-6 flex justify-between items-end">
                  <div>
                    <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mb-0.5">
                      {template.category} • 专业级公文排版规范
                    </div>
                    <div className="text-[10px] text-slate-500 font-sans">
                      机密等级：标准内部受控文本
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[8px] px-1.5 py-0.5 rounded bg-rose-50 border border-rose-200 text-rose-600 font-bold tracking-wider uppercase font-sans">
                      内部公开
                    </span>
                  </div>
                </div>
              )}

              {pageLines.map((line, idx) => {
                const trimmed = line.trim();

                // Heading 1 / main Title detection (only on page 1)
                if (pageIdx === 0 && idx === 0) {
                  return (
                    <h1 key={idx} className="text-center font-serif font-black text-slate-900 text-lg sm:text-xl tracking-tight mt-1 mb-5 uppercase leading-tight">
                      {trimmed}
                    </h1>
                  );
                }

                // Section Heading (e.g., "第一条", "一、 ")
                const isHeading = /^(第[一二三四五六七八九十]+[章节条]|第[一二三四五六七八九十]+\s|[一二三四五六七八九十\d]+\s*、)/.test(trimmed);
                if (isHeading) {
                  return (
                    <h3 key={idx} className="font-serif font-bold text-slate-900 text-xs mt-4 mb-1.5 leading-tight">
                      {trimmed}
                    </h3>
                  );
                }

                // Bullet lists
                if (trimmed.startsWith("-") || trimmed.startsWith("*") || trimmed.startsWith("•")) {
                  const cleanText = trimmed.replace(/^[-*•]\s*/, "");
                  return (
                    <li key={idx} className="list-none pl-4 text-slate-700 my-1 py-0.5 border-l-2 border-blue-200 font-sans">
                      {cleanText}
                    </li>
                  );
                }

                // Check if empty line
                if (trimmed === "") {
                  return <div key={idx} className="h-3" />;
                }

                // Signatures line
                if (trimmed.includes("______") || trimmed.includes("本人签章")) {
                  return (
                    <p key={idx} className="text-slate-800 font-bold py-1.5 mt-3 tracking-wide font-sans text-right">
                      {trimmed}
                    </p>
                  );
                }

                // Standard paragraph
                let processedLine = trimmed;
                
                return (
                  <p key={idx} className="text-slate-700 mb-2 py-0.5 text-justify indent-6 tracking-wide leading-relaxed font-sans text-xs">
                    {processedLine.split(/(\[待填写: [^\]]+\]|\{\{[a-zA-Z0-9_-]+\}\})/).map((segment, sIdx) => {
                      if (segment.startsWith("[待填写:")) {
                        return (
                          <span key={sIdx} className="bg-rose-50 text-rose-600 font-bold px-1 rounded border border-rose-200 animate-pulse text-[10px] inline-block mx-0.5">
                            {segment}
                          </span>
                        );
                      }

                      if (segment.startsWith("{{") && segment.endsWith("}}")) {
                        const key = segment.slice(2, -2);
                        const f = template.fields.find(field => field.key === key);
                        if (f && f.type === "image") {
                          const imgVal = values[key];
                          if (imgVal) {
                            return (
                              <span key={sIdx} className="inline-block align-middle mx-1 my-1">
                                <img 
                                  src={imgVal} 
                                  alt={f.label} 
                                  className="max-h-12 max-w-32 object-contain border border-slate-150 rounded shadow-xs" 
                                  referrerPolicy="no-referrer"
                                />
                              </span>
                            );
                          } else {
                            return (
                              <span key={sIdx} className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-dashed border-amber-300 rounded px-1.5 py-0.5 text-[10px] font-bold align-middle mx-1 select-none">
                                <Upload className="h-2.5 w-2.5 inline text-amber-500" />
                                [待载入印章: {f.label}]
                              </span>
                            );
                          }
                        }
                      }
                      
                      let partToRender = segment;
                      let hasHighlight = false;
                      
                      template.fields.forEach(field => {
                        const val = values[field.key];
                        if (val && val.trim() !== "" && partToRender.includes(val)) {
                          hasHighlight = true;
                        }
                      });

                      if (hasHighlight) {
                        let segmentsTemp = [partToRender];
                        template.fields.forEach(field => {
                          const val = values[field.key];
                          if (val && val.trim() !== "") {
                            let nextSegments: string[] = [];
                            segmentsTemp.forEach(s => {
                              const parts = s.split(val);
                              for (let i = 0; i < parts.length; i++) {
                                nextSegments.push(parts[i]);
                                if (i < parts.length - 1) {
                                  nextSegments.push(`__VAL_HIGHLIGHT__${val}__END__`);
                                }
                              }
                            });
                            segmentsTemp = nextSegments;
                          }
                        });

                        return (
                          <span key={sIdx}>
                            {segmentsTemp.map((subSeg, subIdx) => {
                              if (subSeg.startsWith("__VAL_HIGHLIGHT__") && subSeg.endsWith("__END__")) {
                                const actualVal = subSeg.replace("__VAL_HIGHLIGHT__", "").replace("__END__", "");
                                return (
                                  <strong key={subIdx} className="text-blue-700 font-bold px-0.5 underline decoration-blue-300 decoration-2 underline-offset-2 bg-blue-50/40">
                                    {actualVal}
                                  </strong>
                                );
                              }
                              return subSeg;
                            })}
                          </span>
                        );
                      }

                      return <span key={sIdx}>{partToRender}</span>;
                    })}
                  </p>
                );
              })}
            </div>

            {/* Pagination numbers per simulated page */}
            <div className="pt-3 border-t border-slate-100 flex justify-between items-center text-[9px] text-slate-400 select-none font-sans">
              <span>© DocuDraft Pro | 标准受控文档印章系统</span>
              <span>第 {pageIdx + 1} 页 / 共 {paginatedPages.length} 页</span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-slate-200 rounded-xl border border-slate-300 shadow-xs overflow-hidden" id="document-viewer">
      {/* Viewer controls bar */}
      <div className="bg-white border-b border-slate-200 px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-slate-500" />
          <span className="text-xs font-semibold text-slate-800">
            实时文档编译预览
          </span>
          {isFreeEditing ? (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 border border-amber-200 animate-pulse">
              自由编辑模式
            </span>
          ) : (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 border border-emerald-200">
              智能同步已激活
            </span>
          )}
        </div>

        {/* Toolbar of Action Buttons */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] sm:text-xs font-medium text-amber-700 bg-amber-50/70 border border-amber-200 px-3 py-1.5 rounded-lg select-none">
            ⚠️ 预览功能仅作预览，具体成品请导出
          </span>

          {/* Export and download DOCX */}
          <button
            onClick={handleExportWord}
            className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-3.5 py-1.5 text-xs font-bold shadow-xs shadow-blue-200 transition-all cursor-pointer pointer-events-auto shrink-0"
            id="btn-export-word"
          >
            <Download className="h-3.5 w-3.5" />
            <span>导出 Word</span>
          </button>
        </div>
      </div>

      {/* Embedded Document Canvas Paper Sheet */}
      <div ref={previewScrollContainerRef} className="flex-1 overflow-y-auto p-8 flex justify-center items-start min-h-[500px]">
        <div id="printable-document" className="w-full max-w-3xl flex flex-col items-center">
          {isFreeEditing ? (
            <div className="bg-white w-full min-h-[1100px] h-auto shadow-2xl border border-slate-200/80 p-8 sm:p-12 md:p-14 relative">
              <div className="h-full flex flex-col gap-2 pb-6">
                <label className="text-[10px] text-amber-500 font-bold select-none flex items-center gap-1 uppercase tracking-wider">
                  ⚠️ 您正在自由修改文书内容（改动不会反馈回左侧表单）：
                </label>
                <textarea
                  value={freeEditText}
                  onChange={(e) => setFreeEditText(e.target.value)}
                  className="flex-grow w-full bg-slate-50 p-4 border border-dashed border-amber-300 rounded text-xs font-mono text-slate-800 leading-relaxed focus:outline-hidden focus:bg-white transition-all resize-none min-h-[850px]"
                  placeholder="在此尽情对完稿文书进行微调，随后可直接进行 Word 导出..."
                />
              </div>
              <div className="absolute right-4 bottom-4 text-[9px] text-slate-350 font-mono tracking-wider select-none pointer-events-none uppercase">
                DocuDraft FreeEdit
              </div>
            </div>
          ) : (
            <div className="w-full flex flex-col gap-6">
              {renderFormattedPreview()}
              
              {/* Real-time synced status info block */}
              <div className="w-full flex justify-between items-center px-4 py-2.5 bg-white/70 border border-slate-200 rounded-lg text-[10px] text-slate-500 font-sans shadow-2xs select-none">
                <span>© DocuDraft Pro | 标准受控文档印章系统</span>
                <span className="font-bold">
                  共 {template.docxBase64 && trueDocxPageCount ? trueDocxPageCount : paginatedPages.length} 页 (分段已完成)
                </span>
                <div className="flex gap-1 items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                  <span>引擎同步中</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Styled Printable Frame Target (Pure CSS Printable layout injected) */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-document, #printable-document * {
            visibility: visible !important;
          }
          #printable-document {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: auto !important;
            border: none !important;
            box-shadow: none !important;
            padding: 2cm !important;
            margin: 0 !important;
            font-size: 14pt !important;
            line-height: 1.5 !important;
            background: white !important;
          }
        }
      `}</style>
    </div>
  );
}
