import React, { useState, useRef, useEffect } from "react";
import { DocumentTemplate, TemplateField } from "../types";
import { 
  X, 
  Upload, 
  CheckCircle, 
  Trash2, 
  Type, 
  Calendar, 
  Image as ImageIcon, 
  FileText, 
  FileSignature, 
  HelpCircle,
  Hash,
  AlertCircle
} from "lucide-react";
import PizZip from "pizzip";

interface CustomTemplateWizardProps {
  onClose: () => void;
  onSaveTemplate: (newTemplate: DocumentTemplate) => void;
}

interface ExtractedImage {
  path: string;
  dataUrl: string;
  extension: string;
  isEnabled: boolean;
  label: string;
}

export default function CustomTemplateWizard({
  onClose,
  onSaveTemplate,
}: CustomTemplateWizardProps) {
  // Metadata States
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<DocumentTemplate["category"]>("自定义");

  // File states
  const [rawText, setRawText] = useState("");
  const [uploadedHtml, setUploadedHtml] = useState<string | null>(null);
  const [uploadedDocxBase64, setUploadedDocxBase64] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Extracted state lists
  const [detectedTextPlaceholders, setDetectedTextPlaceholders] = useState<string[]>([]);
  const [detectedImages, setDetectedImages] = useState<ExtractedImage[]>([]);

  // Drag state
  const [dragActive, setDragActive] = useState(false);

  // Safe chunked Base64 converter for files
  const uint8ArrayToBase64 = (arr: Uint8Array): string => {
    let binary = "";
    const len = arr.byteLength;
    const chunk = 8192;
    for (let i = 0; i < len; i += chunk) {
      const sub = arr.subarray(i, Math.min(i + chunk, len));
      binary += String.fromCharCode.apply(null, sub as any);
    }
    return window.btoa(binary);
  };

  // Auto-scan placeholders from loaded raw text
  const scanPlaceholders = (text: string): string[] => {
    if (!text) return [];
    // Matches {placeholder} and {{placeholder}} and filters out spaces or system strings
    const regexSingle = /\{([^{}\s]+)\}/g;
    const regexDouble = /\{\{([^{}\s]+)\}\}/g;
    const matches = new Set<string>();

    const doubleMatches = Array.from(text.matchAll(regexDouble)).map(m => m[1]);
    doubleMatches.forEach(n => {
      const clean = n.trim();
      if (clean && !clean.startsWith("%") && !clean.startsWith("#") && !clean.startsWith("/") && clean.length < 30) {
        matches.add(clean);
      }
    });

    const singleMatches = Array.from(text.matchAll(regexSingle)).map(m => m[1]);
    singleMatches.forEach(n => {
      const clean = n.trim().replace(/[{}]/g, "");
      if (clean && !clean.startsWith("%") && !clean.startsWith("#") && !clean.startsWith("/") && clean.length < 30) {
        matches.add(clean);
      }
    });

    return Array.from(matches);
  };

  // File loader & parser
  const parseDocumentFile = async (file: File) => {
    setIsParsing(true);
    setErrorMsg(null);
    setUploadedFileName(file.name);

    // Default template title to the filename without extension
    const dotIndex = file.name.lastIndexOf(".");
    const suggestedTitle = dotIndex > -1 ? file.name.substring(0, dotIndex) : file.name;
    setTitle(suggestedTitle);
    setDescription(`导入自 Word 公文: ${file.name}`);

    const isDocx = file.name.endsWith(".docx") || file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

    if (isDocx) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const arrayBuffer = e.target?.result;
        if (!(arrayBuffer instanceof ArrayBuffer)) {
          setErrorMsg("文件流读取失败");
          setIsParsing(false);
          return;
        }

        try {
          // 1. Process ZIP archive to list images from word/media/
          const zip = new PizZip(arrayBuffer);
          const mediaPaths = Object.keys(zip.files).filter(path => path.startsWith("word/media/"));
          
          const extractedImgs: ExtractedImage[] = mediaPaths.map((mediaPath, idx) => {
            const rawFile = zip.files[mediaPath];
            const bytes = rawFile.asUint8Array();
            const ext = mediaPath.split(".").pop()?.toLowerCase() || "png";
            const base64 = uint8ArrayToBase64(bytes);
            const mime = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : `image/${ext}`;
            const dataUrl = `data:${mime};base64,${base64}`;

            // Provide default friendly names
            let defaultLabel = `图片 ${idx + 1}`;
            if (mediaPath.toLowerCase().includes("seal") || mediaPath.toLowerCase().includes("stamp")) {
              defaultLabel = "电子公章";
            } else if (mediaPath.toLowerCase().includes("sign")) {
              defaultLabel = "经办人签名";
            }

            return {
              path: mediaPath,
              dataUrl,
              extension: ext,
              isEnabled: false, // User will explicitly select to list/replace them
              label: defaultLabel
            };
          });

          setDetectedImages(extractedImgs);

          // 2. Convert base64 to send to backend Mammoth API
          const docBytes = new Uint8Array(arrayBuffer);
          let binary = "";
          for (let i = 0; i < docBytes.byteLength; i++) {
            binary += String.fromCharCode(docBytes[i]);
          }
          const base64ForServer = window.btoa(binary);
          setUploadedDocxBase64(base64ForServer);

          // Contact backend for high-fidelity Mammoth text and html conversion
          const response = await fetch("/api/parse-word", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ base64: base64ForServer }),
          });

          if (!response.ok) {
            throw new Error("服务端解析 Office Word 模板失败");
          }

          const resData = await response.json();
          const docText = resData.text || "";
          setRawText(docText);
          setUploadedHtml(resData.html || null);

          // Scan placeholders
          const detectedVars = scanPlaceholders(docText);
          setDetectedTextPlaceholders(detectedVars);

        } catch (err: any) {
          console.error("Error reading Word template:", err);
          setErrorMsg(`解析 Word 文件出错: ${err.message || err}`);
        } finally {
          setIsParsing(false);
        }
      };

      reader.onerror = () => {
        setErrorMsg("文件读取失败");
        setIsParsing(false);
      };
      reader.readAsArrayBuffer(file);
    } else {
      // Plain text files
      const reader = new FileReader();
      reader.onload = (e) => {
        const textStr = e.target?.result;
        if (typeof textStr === "string") {
          setRawText(textStr);
          setUploadedHtml(null);
          setUploadedDocxBase64(null);
          setDetectedImages([]);
          
          const vars = scanPlaceholders(textStr);
          setDetectedTextPlaceholders(vars);
        }
        setIsParsing(false);
      };
      reader.onerror = () => {
        setErrorMsg("读取纯文本失败");
        setIsParsing(false);
      };
      reader.readAsText(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      parseDocumentFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      parseDocumentFile(e.target.files[0]);
    }
  };

  // Toggle active image replacements
  const toggleImageEnabled = (path: string) => {
    setDetectedImages(prev => prev.map(img => {
      if (img.path === path) {
        return { ...img, isEnabled: !img.isEnabled };
      }
      return img;
    }));
  };

  // Update replacement labels for selected images
  const updateImageLabel = (path: string, newLabel: string) => {
    setDetectedImages(prev => prev.map(img => {
      if (img.path === path) {
        return { ...img, label: newLabel };
      }
      return img;
    }));
  };

  const handleSaveAndRegister = () => {
    if (!title.trim()) {
      setErrorMsg("请填写模板名称");
      return;
    }
    if (!rawText.trim()) {
      setErrorMsg("文件内容为空，请确保上传了合适的文件");
      return;
    }

    // Prepare template variables fields list
    const fields: TemplateField[] = [];

    // 1. Add detected text variables
    detectedTextPlaceholders.forEach(varKey => {
      let type: TemplateField["type"] = "text";
      
      // Intelligent guessing based on parameter names
      const kLower = varKey.toLowerCase();
      if (kLower.includes("date") || kLower.includes("日期") || kLower.includes("时间") || kLower.includes("期")) {
        type = "date";
      } else if (kLower.includes("price") || kLower.includes("金额") || kLower.includes("数量") || kLower.includes("数字")) {
        type = "number";
      } else if (kLower.includes("detail") || kLower.includes("内容") || kLower.includes("备注")) {
        type = "textarea";
      }

      fields.push({
        key: varKey,
        label: varKey,
        type,
        placeholder: `请录入${varKey}`
      });
    });

    // 2. Add enabled ZIP image replacements
    detectedImages.forEach(img => {
      if (img.isEnabled) {
        fields.push({
          key: img.path, // ZIP file path like word/media/image1.png is the unique identifier variable
          label: img.label || `替换原图_${img.path.split("/").pop()}`,
          type: "image",
          placeholder: `上传以等尺寸替换该图片 (${img.label})`,
          defaultValue: img.dataUrl // Default keeps the original image intact
        });
      }
    });

    const newTemplate: DocumentTemplate = {
      id: `custom-imported-${Date.now()}`,
      title: title.trim(),
      description: description.trim() || "导入的自定义模板",
      category,
      contentTemplate: rawText,
      htmlTemplate: uploadedHtml || undefined,
      fields,
      docxBase64: uploadedDocxBase64 || undefined
    };

    onSaveTemplate(newTemplate);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-sans" id="custom-template-wizard">
      <div className="bg-white rounded-2xl w-full max-w-5xl border border-slate-200 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Head Bar */}
        <div className="border-b border-slate-100 px-6 py-4 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <FileSignature className="h-5 w-5 text-blue-600" />
            <div>
              <h3 className="font-sans font-bold text-slate-800 text-sm">
                通用公文导入与自动分析向导
              </h3>
              <p className="text-[11px] text-slate-500 font-sans mt-0.5">
                简单几步，即可将现有的 Word 范本转换为高精度填充系统，自动扫描标记。
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-all cursor-pointer"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Wizard Main Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 flex flex-col min-h-0">
          {errorMsg && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-150 rounded-lg flex items-start gap-2 text-rose-800 text-xs font-sans">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
              <div>
                <strong className="font-bold">操作有误：</strong>
                <span>{errorMsg}</span>
              </div>
            </div>
          )}

          {!uploadedFileName ? (
            /* STAGE 1: Drag-and-drop Uploader */
            <div className="my-auto max-w-lg mx-auto w-full">
              <div 
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-10 transition-all text-center flex flex-col items-center justify-center gap-4 cursor-pointer relative min-h-[300px] ${
                  dragActive 
                    ? "border-blue-500 bg-blue-50/50" 
                    : "border-slate-300 bg-white hover:bg-slate-50/50 hover:border-blue-400 shadow-sm"
                }`}
              >
                <input
                  type="file"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.txt"
                  onChange={handleFileChange}
                />
                
                <div className="p-4 bg-blue-50 rounded-full text-blue-600">
                  <Upload className="h-8 w-8 stroke-1.5 animate-pulse" />
                </div>

                <div>
                  <h4 className="font-bold text-slate-800 text-sm">导入本地 Word 文档 (.docx) 或 TXT 文件</h4>
                  <p className="text-xs text-slate-400 mt-2 max-w-xs mx-auto leading-relaxed">
                    拖拽文件到此，或者 <span className="text-blue-600 font-bold underline">点击浏览文件</span>。系统将自动解析您的文字，并提取其中所有的图档及占位符。
                  </p>
                </div>

                <div className="flex items-center gap-4 text-[10px] text-slate-400 font-mono mt-2 pt-4 border-t border-slate-100 w-full justify-center">
                  <span>支持 Word (Docx)</span>
                  <span>•</span>
                  <span>文字占位符自动匹配</span>
                  <span>•</span>
                  <span>印章原有尺寸替换</span>
                </div>
              </div>
            </div>
          ) : (
            /* STAGE 2: Settings and automatic parameters configuration in dynamic columns */
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
              
              {/* Left Column: Metadata & Full text Preview */}
              <div className="lg:col-span-6 flex flex-col gap-4 min-h-0">
                <div className="bg-white rounded-xl border border-slate-150 p-4 space-y-3 shadow-xs shrink-0">
                  <div className="flex justify-between items-center pb-2.5 border-b border-slate-100">
                    <span className="text-xs font-bold text-slate-800">公文模板名与分类</span>
                    <button
                      onClick={() => {
                        setUploadedFileName(null);
                        setRawText("");
                        setUploadedHtml(null);
                        setUploadedDocxBase64(null);
                        setDetectedImages([]);
                        setDetectedTextPlaceholders([]);
                        setErrorMsg(null);
                      }}
                      className="text-[11px] font-bold text-rose-600 hover:text-rose-800 hover:underline cursor-pointer"
                    >
                      重新上传
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <label className="text-[10px] font-bold text-slate-400">模板标题</label>
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="输入模板名称"
                        className="w-full text-xs text-slate-800 font-semibold border border-slate-200 px-2.5 py-1.5 rounded focus:border-blue-500 focus:outline-hidden bg-slate-50 mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400">选择分类</label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value as any)}
                        className="w-full text-xs text-slate-700 font-medium border border-slate-200 px-2.5 py-1.5 rounded focus:border-blue-500 focus:outline-hidden bg-slate-50 mt-1 cursor-pointer"
                      >
                        <option value="自定义">自定义</option>
                        <option value="行政人事">行政人事</option>
                        <option value="商业合同">商业合同</option>
                        <option value="日常办公">日常办公</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400">功能简述</label>
                    <input
                      type="text"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="简短说明或说明范围"
                      className="w-full text-xs text-slate-600 border border-slate-200 px-2.5 py-1.5 rounded focus:border-blue-500 focus:outline-hidden bg-slate-50 mt-1"
                    />
                  </div>
                </div>

                {/* Text Blueprint Preview */}
                <div className="bg-white rounded-xl border border-slate-150 p-4 shadow-xs flex-1 flex flex-col min-h-[250px] overflow-hidden">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mb-2">文件稿件原文预览</span>
                  <div className="flex-1 overflow-y-auto bg-slate-50 border border-slate-200 rounded-lg p-3 font-mono text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {/* Render raw text, highlight placeholders if any */}
                    {isParsing ? (
                      <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs">
                        <span className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full mb-1"></span>
                        <span>正在进行核心词组高速分析...</span>
                      </div>
                    ) : rawText ? (
                      rawText.split(/(\{.*?\})/).map((part, index) => {
                        const isMatch = part.startsWith("{") && part.endsWith("}");
                        if (isMatch) {
                          return (
                            <span key={index} className="inline-block px-1.5 py-0.5 text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded mx-0.5">
                              {part}
                            </span>
                          );
                        }
                        return part;
                      })
                    ) : (
                      <span className="text-slate-400 italic">空文档</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Dynamic Parameters Match list */}
              <div className="lg:col-span-6 flex flex-col min-h-0">
                <div className="bg-white rounded-xl border border-slate-150 shadow-xs flex-grow flex flex-col min-h-[400px] overflow-hidden">
                  
                  {/* Parameter Lists Title */}
                  <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex items-center justify-between shrink-0">
                    <span className="text-xs font-bold text-slate-800">
                      🛠️ 智能匹配与变量注册
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 font-bold rounded">
                      共 {detectedTextPlaceholders.length + detectedImages.filter(i => i.isEnabled).length} 个可更改参数
                    </span>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-5">
                    
                    {/* Section 1: Auto detected placeholders */}
                    <div>
                      <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Type className="h-3.5 w-3.5 text-blue-600" />
                        <span>自动发现的文本更变项 ({detectedTextPlaceholders.length})</span>
                      </h4>

                      {detectedTextPlaceholders.length === 0 ? (
                        <p className="text-[11px] text-slate-400 italic bg-slate-50 p-3 rounded border border-dashed border-slate-200">
                          未能在文档中匹配到形如 {"{可变字段}"} 的内容占位。
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {detectedTextPlaceholders.map((varKey) => (
                            <div 
                              key={varKey}
                              className="flex items-center gap-2 p-2 rounded-lg bg-blue-50/50 border border-blue-100 text-xs shadow-3xs"
                            >
                              <div className="p-1.5 bg-blue-100 text-blue-700 rounded-md">
                                <HelpCircle className="h-3.5 w-3.5" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-bold text-slate-800 truncate" title={varKey}>
                                  {varKey}
                                </div>
                                <span className="text-[9px] text-slate-400 font-mono">
                                  标签名称: {"{" + varKey + "}"}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Section 2: Inline document ZIP images */}
                    <div>
                      <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <ImageIcon className="h-3.5 w-3.5 text-emerald-600" />
                        <span>文档内包含的图片/签章 ({detectedImages.length})</span>
                      </h4>
                      <p className="text-[10px] text-slate-400 mb-3 leading-relaxed">
                        系统已经扫描了 docx 压缩包中的所有原始图档。勾选您希望自主选择列出以等比例/等长宽替换的图片（例如红章、原落款签名、大Logo），未勾选的将作为原样保留：
                      </p>

                      {detectedImages.length === 0 ? (
                        <p className="text-[11px] text-slate-400 italic bg-slate-50 p-3 rounded border border-dashed border-slate-200">
                          未在 Word 包中检索到原版排版媒体图片。
                        </p>
                      ) : (
                        <div className="space-y-2.5">
                          {detectedImages.map((img, idx) => (
                            <div 
                              key={img.path}
                              className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                                img.isEnabled 
                                  ? "border-emerald-250 bg-emerald-50/20 shadow-2xs" 
                                  : "border-slate-150 bg-white hover:bg-slate-50/50"
                              }`}
                            >
                              {/* Selection switch */}
                              <input
                                type="checkbox"
                                checked={img.isEnabled}
                                id={`img-chk-${idx}`}
                                onChange={() => toggleImageEnabled(img.path)}
                                className="h-4.5 w-4.5 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
                              />

                              {/* Tiny docx thumbnail */}
                              <div className="w-12 h-12 bg-slate-100 border border-slate-200 rounded-lg flex items-center justify-center p-1 overflow-hidden shrink-0 shadow-3xs">
                                <img 
                                  src={img.dataUrl} 
                                  alt="Docx visual" 
                                  className="max-w-full max-h-full object-contain"
                                  referrerPolicy="no-referrer"
                                />
                              </div>

                              {/* Configuration detail inputs */}
                              <div className="flex-grow min-w-0">
                                <label 
                                  htmlFor={`img-chk-${idx}`}
                                  className="text-[10px] uppercase font-bold text-slate-400 tracking-wide cursor-pointer"
                                >
                                  排版位置: {img.path.split("/").pop()} ({img.extension.toUpperCase()})
                                </label>
                                
                                {img.isEnabled ? (
                                  <input
                                    type="text"
                                    value={img.label}
                                    onChange={(e) => updateImageLabel(img.path, e.target.value)}
                                    placeholder="命名签名或公章位置标签 (如: 甲方盖章)"
                                    className="w-full text-xs font-semibold text-slate-800 border-b border-dashed border-slate-300 hover:border-slate-400 focus:border-emerald-500 bg-transparent py-0.5 focus:outline-hidden mt-1 placeholder:font-normal"
                                  />
                                ) : (
                                  <div className="text-xs text-slate-500 font-medium truncate mt-0.5">
                                    {img.label} <span className="text-[10px] text-slate-400 font-normal">(原样保留不做替换)</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Actions Row */}
        <div className="border-t border-slate-100 px-6 py-4 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-400 font-sans hidden sm:block">
            {uploadedFileName ? "自动发现变量算法完美支持同名参数映射整合" : "上传文件即代表您承认文件适用于模板引擎"}
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={onClose}
              className="bg-white hover:bg-slate-150 border border-slate-200 text-slate-600 text-xs font-semibold px-4 py-2 rounded-lg cursor-pointer transition-all"
            >
              取消
            </button>
            <button
              onClick={handleSaveAndRegister}
              disabled={!uploadedFileName || isParsing}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-lg cursor-pointer transition-all flex items-center gap-1.5"
            >
              <CheckCircle className="h-4 w-4" />
              <span>保存并在左侧填表单</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
