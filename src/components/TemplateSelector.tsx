import React, { useState, useMemo, useRef } from "react";
import { DocumentTemplate } from "../types";
import { Search, FolderOpen, FileCheck, FileCode, Edit3, Plus, Trash2, Share2, Download, Upload, Check } from "lucide-react";

interface TemplateSelectorProps {
  templates: DocumentTemplate[];
  selectedTemplateId: string;
  onSelectTemplate: (template: DocumentTemplate) => void;
  onOpenCustomWizard: () => void;
  onDeleteTemplate: (id: string) => void;
  onSaveTemplate: (template: DocumentTemplate) => Promise<void> | void;
}

export default function TemplateSelector({
  templates,
  selectedTemplateId,
  onSelectTemplate,
  onOpenCustomWizard,
  onDeleteTemplate,
  onSaveTemplate,
}: TemplateSelectorProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("全部");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categories = ["全部", "行政人事", "商业合同", "日常办公", "自定义"];

  const filteredTemplates = useMemo(() => {
    return templates.filter((t) => {
      const matchesSearch =
        t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = activeCategory === "全部" || t.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [templates, searchTerm, activeCategory]);

  const handleCopyShareLink = (e: React.MouseEvent, template: DocumentTemplate) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      const templateStr = JSON.stringify(template);
      const encoded = btoa(encodeURIComponent(templateStr));
      const shareUrl = `${window.location.origin}${window.location.pathname}?template=${encoded}`;
      
      navigator.clipboard.writeText(shareUrl).then(() => {
        setCopiedId(template.id);
        setTimeout(() => setCopiedId(null), 2000);
      });
    } catch (err) {
      console.error("生成分享链接失败:", err);
      alert("生成分享链接失败！");
    }
  };

  const handleExportTemplates = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const customTemplates = templates.filter((t) => t.category === "自定义");
    if (customTemplates.length === 0) {
      alert("没有可导出的自定义模板。请先在下方创建或通过 URL 导入模板。");
      return;
    }
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(customTemplates, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `custom_templates_backup_${new Date().toISOString().split("T")[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (err) {
      console.error("导出配置文件失败:", err);
    }
  };

  const handleImportClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    fileInputRef.current?.click();
  };

  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result;
        if (typeof text !== "string") return;
        const parsed = JSON.parse(text);
        const importedArray = Array.isArray(parsed) ? parsed : [parsed];

        let successCount = 0;
        for (const item of importedArray) {
          if (item.id && item.title && Array.isArray(item.fields)) {
            item.category = "自定义"; // Keep inside user custom category
            await onSaveTemplate(item);
            successCount++;
          }
        }

        if (successCount > 0) {
          alert(`🎉 成功导入 ${successCount} 个自定义模板！`);
        } else {
          alert("导入失败：文件里的 JSON 数据不包含标准的模板结构字段。");
        }
      } catch (err) {
        console.error("解析文件失败:", err);
        alert("导入解析失败，请确保导入的是我们合法导出的拼音或 JSON 配置文件！");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs" id="template-selector">
      <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div className="min-w-0 flex-1">
          <h2 className="font-sans text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <FolderOpen className="h-4 w-4 text-blue-600" />
            1. 选择或导入文档模板
          </h2>
          <p className="text-xs text-slate-550 mt-0.5">
            选择现有模板，或导入配置文件、点击新增通过 Word 文件智能解析。
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 self-start shrink-0">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportFileChange}
            accept=".json"
            className="hidden"
          />
          <button
            onClick={handleImportClick}
            className="inline-flex items-center gap-1 rounded bg-slate-50 hover:bg-slate-100 px-2.5 py-1.5 text-xs font-bold text-slate-700 transition-all cursor-pointer border border-slate-200"
            title="导入自定义模板配置文件 (.json)"
          >
            <Upload className="h-3 w-3" />
            导入
          </button>
          <button
            onClick={handleExportTemplates}
            className="inline-flex items-center gap-1 rounded bg-slate-50 hover:bg-slate-100 px-2.5 py-1.5 text-xs font-bold text-slate-700 transition-all cursor-pointer border border-slate-200"
            title="备份导出所有的自定义模板 (.json)"
          >
            <Download className="h-3 w-3" />
            备份
          </button>
          <button
            onClick={onOpenCustomWizard}
            className="inline-flex items-center gap-1 rounded bg-blue-50 px-2.5 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100 transition-all pointer-events-auto cursor-pointer border border-blue-200"
            id="btn-custom-import"
          >
            <Plus className="h-3 w-3" />
            新增模板
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative mb-4">
        <Search className="absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="搜索系统模板或简要描述..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full rounded border border-slate-200 bg-slate-50 py-2 pl-9 pr-4 text-xs font-sans text-slate-850 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:outline-hidden transition-all"
        />
      </div>

      {/* Categories Tabs */}
      <div className="flex flex-wrap gap-1 mb-4 border-b border-slate-100 pb-3">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setActiveCategory(category)}
            className={`px-3 py-1 text-xs rounded font-medium transition-all pointer-events-auto cursor-pointer ${
              activeCategory === category
                ? "bg-slate-800 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Grid of Templates */}
      <div className="grid grid-cols-1 gap-2.5 max-h-[220px] overflow-y-auto pr-1">
        {filteredTemplates.length > 0 ? (
          filteredTemplates.map((template) => {
            const isSelected = template.id === selectedTemplateId;
            return (
              <div
                key={template.id}
                onClick={() => onSelectTemplate(template)}
                className={`group flex items-center justify-between p-3 rounded border transition-all pointer-events-auto cursor-pointer ${
                  isSelected
                    ? "border-blue-600 bg-blue-50/20 shadow-xs"
                    : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                }`}
                id={`tpl-item-${template.id}`}
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div
                    className={`mt-0.5 p-1.5 rounded shrink-0 ${
                      isSelected ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {template.category === "商业合同" ? (
                      <FileCheck className="h-4 w-4" />
                    ) : template.category === "行政人事" ? (
                      <Edit3 className="h-4 w-4" />
                    ) : (
                      <FileCode className="h-4 w-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="text-xs font-bold text-slate-700 truncate flex items-center gap-1.5">
                        <span className="truncate">{template.title}</span>
                        {template.category !== "自定义" && (
                          <span className="text-[10px] font-medium text-amber-700 bg-amber-50 px-1 py-0.5 rounded shrink-0 border border-amber-100">
                            示例
                          </span>
                        )}
                      </span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-bold shrink-0 ${
                          template.category === "行政人事"
                            ? "bg-pink-50 text-pink-700 border border-pink-100"
                            : template.category === "商业合同"
                            ? "bg-blue-50 text-blue-700 border border-blue-100"
                            : template.category === "自定义"
                            ? "bg-purple-50 text-purple-700 border border-purple-100"
                            : "bg-slate-100 text-slate-700 border border-slate-200"
                        }`}
                      >
                        {template.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1 leading-normal">
                      {template.description}
                    </p>
                  </div>
                </div>

                {template.category === "自定义" && (
                  <div className="ml-2 shrink-0 flex items-center gap-1.5 opacity-100 sm:opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                    {confirmDeleteId === template.id ? (
                      <div className="flex items-center gap-1 bg-red-50 border border-red-200 rounded px-1.5 py-0.5 shadow-2xs">
                        <span className="text-[10px] font-bold text-red-700 select-none">删除该模板？</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            onDeleteTemplate(template.id);
                            setConfirmDeleteId(null);
                          }}
                          className="px-1.5 py-0.5 bg-red-600 hover:bg-red-700 text-white rounded text-[9px] font-bold pointer-events-auto cursor-pointer transition-all"
                        >
                          确定
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            setConfirmDeleteId(null);
                          }}
                          className="px-1.5 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-[9px] font-bold pointer-events-auto cursor-pointer transition-all"
                        >
                          取消
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => handleCopyShareLink(e, template)}
                          className={`p-1.5 rounded transition-all cursor-pointer ${
                            copiedId === template.id
                              ? "text-emerald-600 bg-emerald-55"
                              : "text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                          }`}
                          title={copiedId === template.id ? "分享链接已复制！" : "复制此模板的极速免登录分享链接"}
                        >
                          {copiedId === template.id ? (
                            <Check className="h-3.5 w-3.5" />
                          ) : (
                            <Share2 className="h-3.5 w-3.5" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            setConfirmDeleteId(template.id);
                          }}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-rose-50 rounded transition-all cursor-pointer"
                          title="删除该自定义模板"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="text-center py-6 border border-dashed border-slate-200 rounded-lg">
            <p className="text-xs text-slate-400">没有找到匹配该筛选的文书模板</p>
          </div>
        )}
      </div>
    </div>
  );
}
