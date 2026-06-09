import React from "react";
import { FileText, Sparkles, CheckCircle2 } from "lucide-react";

export default function Header() {
  return (
    <header className="border-b border-slate-200 bg-white px-8 py-4 shrink-0 transition-all font-sans" id="app-header">
      <div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center text-red-650 shrink-0 select-none">
            <svg viewBox="0 0 100 100" className="h-[36px] w-[36px]" fill="#d91010">
              {/* Column 1 (far left) */}
              <polygon points="5,25 23,17 23,95 5,95" />
              {/* Column 2 (middle left) */}
              <polygon points="29,14 47,6 47,95 29,95" />
              {/* Column 3 (middle right) */}
              <polygon points="53,6 71,14 71,69 53,75" />
              {/* Column 4 (far right) */}
              <polygon points="77,17 95,25 95,60 77,66" />
              {/* Bottom-right Block */}
              <polygon points="53,85 95,70 95,95 53,95" />
            </svg>
          </div>
          <div>
            <h1 className="font-sans text-xl font-bold tracking-tight text-slate-850 flex items-center gap-2">
              劲群科技维保服务
              <span className="inline-flex items-center gap-1 rounded bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 uppercase tracking-wider">
                <Sparkles className="h-2.5 w-2.5" /> AI Co-pilot
              </span>
            </h1>
            <p className="text-xs text-slate-550">
              根据选定的文档模板与用户输入生成专业文档，并一键导出为 Microsoft Word 格式进行下载与打印。
            </p>
          </div>
        </div>

        {/* Style-matched nav tabs from the Sleek Design */}
        <div className="hidden md:flex gap-6 items-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
          <span className="text-blue-600 border-b-2 border-blue-600 pb-1 cursor-default">编辑器</span>
        </div>

        <div className="flex items-center gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-1.5 rounded bg-emerald-50 px-2.5 py-1 text-emerald-800 font-bold border border-emerald-200/60 shadow-xs">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 animate-pulse" />
            引擎就绪 (Stable)
          </div>
        </div>
      </div>
    </header>
  );
}
