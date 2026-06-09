import React, { useState } from "react";
import { TemplateField } from "../types";
import { Sparkles, Loader2, RotateCcw } from "lucide-react";

interface VariableInputFormProps {
  fields: TemplateField[];
  values: Record<string, string>;
  onValueChange: (key: string, value: string) => void;
  onResetValues: () => void;
}

export default function VariableInputForm({
  fields,
  values,
  onValueChange,
  onResetValues,
}: VariableInputFormProps) {
  const [loadingFieldKey, setLoadingFieldKey] = useState<string | null>(null);
  const [activeMenuKey, setActiveMenuKey] = useState<string | null>(null);
  const [errorFieldKey, setErrorFieldKey] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleOptimize = async (field: TemplateField, command: string) => {
    const currentText = values[field.key] || "";
    if (!currentText.trim()) return;

    setLoadingFieldKey(field.key);
    setActiveMenuKey(null);
    setErrorFieldKey(null);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/ai/optimize-field", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: currentText,
          command,
          label: field.label,
        }),
      });

      if (!res.ok) {
        let errMsg = "AI 润色优化失败，请稍后重试。";
        try {
          const errData = await res.json();
          if (errData && errData.error) {
            errMsg = errData.error;
          }
        } catch (_) {}
        throw new Error(errMsg);
      }

      const data = await res.json();
      if (data.optimizedText) {
        onValueChange(field.key, data.optimizedText);
      }
    } catch (err: any) {
      console.error("Error optimizing text:", err);
      setErrorFieldKey(field.key);
      setErrorMessage(err.message || "AI 润色优化失败，请稍后重试。");
    } finally {
      setLoadingFieldKey(null);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs font-sans" id="variable-input-form">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="font-sans text-xs font-bold text-slate-400 uppercase tracking-wider">
            2. 填写文书动态指标
          </h2>
          <p className="text-xs text-slate-550 mt-0.5">
            输入的数据将实时替换文档中的对应占位符：
          </p>
        </div>
        <button
          onClick={onResetValues}
          title="清空当前输入，恢复初始设定"
          className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-850 font-bold cursor-pointer transition-all pointer-events-auto"
        >
          <RotateCcw className="h-3 w-3" />
          重置
        </button>
      </div>

      <div className="space-y-4">
        {fields.map((field) => {
          const value = values[field.key] ?? "";
          const isLoading = loadingFieldKey === field.key;
          const isTextLike = field.type === "text" || field.type === "textarea";

          return (
            <div key={field.key} className="flex flex-col gap-1.5" id={`form-group-${field.key}`}>
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider flex items-center gap-1.5">
                  {field.label}
                  <span className="text-[10px] text-slate-400 font-normal">({field.key})</span>
                </label>

                {/* AI Polish Trigger (Only for text/textarea fields) */}
                {isTextLike && value.trim().length > 1 && (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setActiveMenuKey(activeMenuKey === field.key ? null : field.key)}
                      disabled={isLoading}
                      className="inline-flex items-center gap-1 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-700 hover:bg-blue-100 disabled:opacity-50 transition-all cursor-pointer pointer-events-auto border border-blue-100"
                    >
                      {isLoading ? (
                        <Loader2 className="h-3 w-3 animate-spin text-blue-600" />
                      ) : (
                        <Sparkles className="h-2.5 w-2.5" />
                      )}
                      <span>AI 润色</span>
                    </button>

                    {/* Optimize Option Menu */}
                    {activeMenuKey === field.key && (
                      <div className="absolute right-0 top-6 z-20 w-36 rounded-lg border border-slate-200 bg-white p-1 shadow-md">
                        <p className="text-[10px] text-slate-400 px-2 py-1 font-sans">
                          修改风格选项：
                        </p>
                        <button
                          type="button"
                          onClick={() => handleOptimize(field, "让语气听起来更为正式、严谨和专业。适用于向雇主或核心合伙人陈述。")}
                          className="w-full text-left text-[11px] text-slate-700 hover:bg-slate-50 px-2.5 py-1.5 rounded transition-all cursor-pointer pointer-events-auto"
                        >
                          👔 更专业正式
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOptimize(field, "将文字进行精炼压缩，删除无作用语助词，表达更为干净、有力且逻辑紧密。")}
                          className="w-full text-left text-[11px] text-slate-700 hover:bg-slate-50 px-2.5 py-1.5 rounded transition-all cursor-pointer pointer-events-auto"
                        >
                          ✂️ 语言精炼化
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOptimize(field, "对当期内容进行合理的细节补充与场景推导扩张，使内容更加丰富充实。")}
                          className="w-full text-left text-[11px] text-slate-700 hover:bg-slate-50 px-2.5 py-1.5 rounded transition-all cursor-pointer pointer-events-auto"
                        >
                          📝 场景化扩写
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Form Input Renderer */}
              <div className="relative">
                {field.type === "textarea" ? (
                  <textarea
                    id={`input-field-${field.key}`}
                    rows={field.key === "reason" || field.key === "completed_tasks" ? 4 : 2}
                    placeholder={field.placeholder}
                    value={value}
                    onChange={(e) => onValueChange(field.key, e.target.value)}
                    disabled={isLoading}
                    className="w-full rounded border border-slate-200 bg-slate-50 p-2.5 text-xs font-sans text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:outline-hidden disabled:bg-slate-5/55 transition-all leading-normal"
                  />
                ) : field.type === "image" ? (
                  <div className="flex flex-col gap-2">
                    {value ? (
                      <div className="flex items-center gap-3 p-2 bg-slate-50 rounded border border-slate-200">
                        <img 
                          src={value} 
                          alt={field.label} 
                          className="h-12 w-24 object-contain rounded bg-white border border-slate-250" 
                          referrerPolicy="no-referrer"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] text-slate-500 font-bold truncate">已载入 {field.label} 图签</p>
                          <button
                            type="button"
                            onClick={() => onValueChange(field.key, "")}
                            className="text-[10px] text-rose-600 hover:text-rose-700 font-bold underline cursor-pointer pointer-events-auto"
                          >
                            移除图片并重新配置
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="relative border border-dashed border-slate-350 rounded p-3 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-400 transition-all flex flex-col items-center justify-center gap-1 min-h-[64px]">
                        <input
                          id={`input-field-${field.key}`}
                          type="file"
                          accept="image/*"
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              const file = e.target.files[0];
                              const reader = new FileReader();
                              reader.onload = (event) => {
                                if (typeof event.target?.result === "string") {
                                  onValueChange(field.key, event.target.result);
                                }
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                        <span className="text-[10px] text-blue-600 font-bold flex items-center gap-1">
                          📤 点击或拖拽上传 {field.label}
                        </span>
                        <p className="text-[9px] text-slate-400">适配公章、电子签名或经办人头像照片</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <input
                    id={`input-field-${field.key}`}
                    type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
                    placeholder={field.placeholder}
                    value={value}
                    onChange={(e) => onValueChange(field.key, e.target.value)}
                    disabled={isLoading}
                    className="w-full rounded border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-sans text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:outline-hidden disabled:bg-slate-5/55 transition-all"
                  />
                )}

                {isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/70 rounded-lg">
                    <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                  </div>
                )}
              </div>

              {/* Local inline error banner for this specific field */}
              {errorFieldKey === field.key && errorMessage && (
                <div className="text-[10px] text-rose-700 bg-rose-50 border border-rose-100 p-2 rounded leading-relaxed mt-1 flex flex-col gap-1">
                  <div className="font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-rose-500 rounded-full"></span>
                    <span>AI 润色优化未成功</span>
                  </div>
                  <p>{errorMessage}</p>
                  {errorMessage.includes("GEMINI_API_KEY") && (
                    <p className="text-slate-500 text-[9px]">
                      提示：请点击右上角 <strong>Settings &gt; Secrets</strong>，新增 <strong>GEMINI_API_KEY</strong> 密钥，保存后即可体验。
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
