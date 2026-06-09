import React, { useState } from "react";
import { TemplateField } from "../types";
import { Sparkles, Loader2, ArrowRightCircle, HelpCircle } from "lucide-react";

interface AICopilotProps {
  fields: TemplateField[];
  onAutoFillSuccess: (extractedValues: Record<string, string>) => void;
  activeTemplateId: string;
}

export default function AICopilot({
  fields,
  onAutoFillSuccess,
  activeTemplateId,
}: AICopilotProps) {
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Suggested quick prompts suited to current template context
  const suggestions: Record<string, Array<{ text: string; label: string }>> = {
    "leave-request": [
      {
        label: "发烧请假",
        text: "我是研发二部的徐天明，因为突然发热38.5度要去医院挂急诊，特此申请从今天起请三天假（10日至12日），手头开发进度已发到Git库交接妥当，敬请领导批准。",
      },
      {
        label: "探亲事事假",
        text: "设计部的李雪梅下周需要回老家办理户籍证明，申请6月15日请假1天，工作由同部门 of 王宇协助照看。",
      },
    ],
    "employment-contract": [
      {
        label: "全栈开发合同",
        text: "极游无线公司聘请陆大林为Unity开发主管，身份证号码为 440301199304128876，合同从2026年7月1日签到2029年7月1日共3年。试用期3个月，月均基础薪资设为3.6万元整。",
      },
      {
        label: "行政文员合同",
        text: "宏图贸易有限公司与前台前台接待小王（王芳芳，身份证 110101199802034321）确立劳动关系，合同约定3年期，自下周一开始。工作岗位是前台内控主管。月收入八千元，试用期定在2个月。",
      },
    ],
    "business-proposal": [
      {
        label: "AI 智能客服系统",
        text: "中通商贸集团委托深蓝智能开发一套AI大模型客服支持系统。项目周期约定为180天，整体费用在850000元。项目第一阶段需要在30天内跑通微信和官网双端API，交付全权限控制面板组件和原始文档。",
      },
    ],
    "meeting-minutes": [
      {
        label: "新品筹备会议",
        text: "今天的筹备会议由技术总监老张主持，记录人小赵。参加的人有大刘、小徐、楚楚。会里聊了下周二进行首轮联调，决定了线上优惠券活动由在6月18日发出，下周五前让楚楚提供全部测试API。",
      },
    ],
    "weekly-report": [
      {
        label: "程序员周报",
        text: "这周我完成了主站支付接口异常断开重连的优化，并把项目Word导出工具合并发布了。下周准备去支援设计系统的性能检查，遇到服务器硬件主板更换导致联调速度慢的问题，需要运维周三下午借一台辅助机子。",
      },
    ],
  };

  const getSuggestionsForTemplate = () => {
    return suggestions[activeTemplateId] || [
      {
        label: "通用示范",
        text: "我叫王大伟，在这份表格中设定我的薪资和签署日期为下周一，工作内容是产品总监...",
      }
    ];
  };

  const handleAutoFill = async () => {
    if (!description.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/ai/auto-fill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fields,
          description,
        }),
      });

      if (!response.ok) {
        let errMsg = "AI 智能提取并填表服务响应异常";
        try {
          const errData = await response.json();
          if (errData && errData.error) {
            errMsg = errData.error;
          }
        } catch (_) {}
        throw new Error(errMsg);
      }

      const data = await response.json();
      if (data && Array.isArray(data.fieldValues)) {
        const valueMap: Record<string, string> = {};
        data.fieldValues.forEach((item: { key: string; value: string }) => {
          valueMap[item.key] = item.value;
        });
        onAutoFillSuccess(valueMap);
      } else {
        throw new Error("未能成功解析出匹配的值。请检查您的文字输入。");
      }
    } catch (err: any) {
      console.error("Error auto filling fields:", err);
      setError(err.message || "自动填充发生问题");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900 text-slate-100 rounded-xl p-5 shadow-sm flex flex-col gap-3 font-sans" id="ai-copilot">
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded bg-blue-600 text-white">
          <Sparkles className="h-4 w-4 animate-pulse" />
        </div>
        <div>
          <h2 className="font-sans text-xs font-bold tracking-wider text-white uppercase">
            🪄 AI 极速智能代填
          </h2>
          <p className="text-[10px] text-slate-400 mt-0.5">
            用自然语言简单描述基本情况，Gemini 将提取要素并一键填毕。
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2 relative">
        <textarea
          rows={3}
          id="textarea-copilot-prompt"
          placeholder="例如：我叫王小明，因为下礼拜二家里有紧急家务需要请事假 2 天..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={loading}
          className="w-full text-xs font-sans text-slate-200 placeholder-slate-500 border border-slate-700 bg-slate-800 rounded p-2.5 focus:border-blue-500 focus:outline-hidden disabled:opacity-75 leading-normal"
        />

        {error && (
          <div className="bg-rose-950/45 border border-rose-900 text-rose-300 rounded p-3 text.5 text-[11px] leading-relaxed">
            <div className="flex gap-1.5 items-center font-bold text-rose-200 mb-1">
              <span className="w-1.5 h-1.5 bg-rose-500 rounded-full"></span>
              <span>AI 服务发生异常</span>
            </div>
            <p>{error}</p>
            {error.includes("GEMINI_API_KEY") && (
              <div className="mt-2 bg-amber-950/20 border border-amber-900/40 p-2.5 rounded text-amber-200 text-[10px] space-y-1">
                <p className="font-bold text-amber-300">💡 快速引导配置 API 密钥：</p>
                <p className="leading-normal">
                  请点击页面右上角 <strong>Settings</strong> (设置齿轮) 菜单中的 <strong>Secrets</strong> 选项卡，添加 <strong>GEMINI_API_KEY</strong>，输入您的 Google AI Studio API 密钥并保存，即可开启极速智能填表。
                </p>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-between items-center mt-1">
          {/* Suggestions Pill Links */}
          <div className="flex flex-wrap gap-1.5 max-w-[70%]">
            <span className="text-[10px] text-slate-500 self-center hidden sm:inline flex items-center gap-0.5">
              <HelpCircle className="h-2.5 w-2.5" /> 推荐示范:
            </span>
            {getSuggestionsForTemplate().map((sug, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setDescription(sug.text)}
                className="text-[10px] bg-slate-800 hover:bg-slate-750 px-2 py-0.5 rounded text-slate-350 border border-slate-700 transition-all cursor-pointer pointer-events-auto"
              >
                {sug.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleAutoFill}
            disabled={loading || !description.trim()}
            className="inline-flex items-center gap-1 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 rounded px-3 py-1.5 text-xs font-bold text-white shadow-xs transition-all cursor-pointer pointer-events-auto"
            id="btn-copilot-run"
          >
            {loading ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>分析中...</span>
              </>
            ) : (
              <>
                <span>智能填表</span>
                <ArrowRightCircle className="h-3.5 w-3.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
