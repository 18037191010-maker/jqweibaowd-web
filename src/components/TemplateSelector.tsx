import React, { useState, useMemo } from "react";
import { DocumentTemplate } from "../types";
import { Search, FolderOpen, FileCheck, FileCode, Edit3, Plus, Trash2 } from "lucide-react";

interface TemplateSelectorProps {
  templates: DocumentTemplate[];
  selectedTemplateId: string;
  onSelectTemplate: (template: DocumentTemplate) => void;
  onOpenCustomWizard: () => void;
  onDeleteTemplate: (id: string) => void;
}

export default function TemplateSelector({
  templates,
  selectedTemplateId,
  onSelectTemplate,
  onOpenCustomWizard,
  onDeleteTemplate,
}: TemplateSelectorProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("全部");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

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

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs" id="template-selector">
      <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-sans text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <FolderOpen className="h-4 w-4 text-blue-600" />
            1. 选择或导入文档模板
          </h2>
          <p className="text-xs text-slate-550 mt-0.5">
            选择对应的规范模板，或直接录入段落交由 AI 分析定制。
          </p>
        </div>
        <button
          onClick={onOpenCustomWizard}
          className="inline-flex items-center gap-1.5 rounded bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100 transition-all pointer-events-auto cursor-pointer border border-blue-200"
          id="btn-custom-import"
        >
          <Plus className="h-3.5 w-3.5" />
          新增模板
        </button>
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
