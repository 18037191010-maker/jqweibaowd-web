import { DocumentTemplate } from "./types";

export const DEFAULT_TEMPLATES: DocumentTemplate[] = [
  {
    id: "leave-request",
    title: "员工请假申请单",
    description: "适用于公司员工请病假、事假、年假、婚假等各类请假事务的正式书面申请表格。",
    category: "行政人事",
    contentTemplate: `请假申请单

申请人信息：
- 申请人名字：{{applicant_name}}
- 所属部门：{{department}}
- 申请时间：{{apply_date}}

请假时段及类型：
- 请假类型：{{leave_type}}
- 开始日期：{{start_time}}
- 结束日期：{{end_time}}
- 共计天数：{{duration_days}} 天

请假原因陈述：
  本人因 {{reason}}，特此申请上述假期的扣减与离职安排。请假期间，本人保持通讯畅通，必要时可进行紧急联络。

工作交接计划：
  离岗期间，日常事务已做妥善交接。特此申请协助批复，感谢关照和支持。

申请人签名（手写/签章）：_____________________
审批部门意见：___________________________
审批人签字：___________________________
批准日期：{{apply_date}}`,
    fields: [
      {
        key: "applicant_name",
        label: "申请人姓名",
        type: "text",
        placeholder: "如：张美琪",
        defaultValue: "张美琪"
      },
      {
        key: "department",
        label: "所属部门",
        type: "text",
        placeholder: "如：市场营销部",
        defaultValue: "市场营销部"
      },
      {
        key: "apply_date",
        label: "申请日期",
        type: "date",
        placeholder: "请选择申请日期",
        defaultValue: new Date().toISOString().split('T')[0]
      },
      {
        key: "leave_type",
        label: "请假类别",
        type: "text",
        placeholder: "如：年假 / 病假 / 事假",
        defaultValue: "病假"
      },
      {
        key: "start_time",
        label: "开始日期",
        type: "date",
        placeholder: "请选择开始时间"
      },
      {
        key: "end_time",
        label: "结束日期",
        type: "date",
        placeholder: "请选择结束时间"
      },
      {
        key: "duration_days",
        label: "请假天数",
        type: "number",
        placeholder: "如：3",
        defaultValue: "3"
      },
      {
        key: "reason",
        label: "请假具体原因",
        type: "textarea",
        placeholder: "请简要填写请假事由...",
        defaultValue: "因近日突发重感冒，伴有发烧，医生建议卧床休息，特此请假三天，忘审批。"
      }
    ]
  },
  {
    id: "employment-contract",
    title: "劳动合同简易版",
    description: "适用于企事业单位与员工签署的标准简易劳动协议，条款正规且方便定制。",
    category: "商业合同",
    contentTemplate: `劳动合同契约书

依据《中华人民共和国劳动法》及相关法规，甲乙双方本着自愿、平等的原则，经友好协商一致，订立本合同，共同遵守契约内容。

第一条 契约基本信息
- 甲方（用人单位）：{{employer_name}}
- 地址：深圳市南山区科技园高新路
- 乙方（劳动者名字）：{{employee_name}}
- 乙方身份证号：{{id_card}}

第二条 工作内容与期限
- 合同有效期限：自 {{start_date}} 起至 {{end_date}} 止，共计 {{term_years}} 年。
- 乙方同意担任甲方的 {{job_position}} 岗位工作。乙方应本着敬业高效的职业操守，按时按质按量完成甲方指派的常规工作及临时工作。

第三条 薪酬与试用期
- 约定试用期为 {{probation_period}} 个月。
- 乙方每月标准薪资待遇为人民币 {{salary}} 元。试用期期间，薪资按标准薪酬的百分之八十发放。
- 薪资发放日：甲方于每月10日前以银行转账形式全额向乙方支付上月薪资金额。

第四条 责任与保密义务
- 乙方在职期间须自觉遵守用人单位的规规章制度，保守商业技术秘密、客户和商业资料。
- 任何一方提前解除劳动合同，应当遵循现行法律并提前30日书面通知对方解决。

第五条 双方签名盖章
- 甲方签章（盖公章）：________________________
- 授权代表人：________________________
- 乙方（签章）：________________________
- 签署日期：{{start_date}}`,
    fields: [
      {
        key: "employer_name",
        label: "甲方（企业名称）",
        type: "text",
        placeholder: "公司或雇主名称",
        defaultValue: "极客科技（深圳）有限公司"
      },
      {
        key: "employee_name",
        label: "乙方（员工姓名）",
        type: "text",
        placeholder: "请输入员工真实姓名",
        defaultValue: "李天恒"
      },
      {
        key: "id_card",
        label: "乙方身份证号码",
        type: "text",
        placeholder: "18位中国大陆居民身份证号",
        defaultValue: "440301199508125432"
      },
      {
        key: "start_date",
        label: "合同开始生效日期",
        type: "date",
        placeholder: "请选择生效日期"
      },
      {
        key: "end_date",
        label: "合同结束失效日期",
        type: "date",
        placeholder: "请选择到期日期"
      },
      {
        key: "term_years",
        label: "合同期限 (年)",
        type: "number",
        placeholder: "请填写年数",
        defaultValue: "3"
      },
      {
        key: "job_position",
        label: "岗位职务",
        type: "text",
        placeholder: "例如：全栈工程师 / 运营主管",
        defaultValue: "高级全栈工程师"
      },
      {
        key: "probation_period",
        label: "试用期月数",
        type: "number",
        placeholder: "例如：3",
        defaultValue: "3"
      },
      {
        key: "salary",
        label: "月工资待遇（元）",
        type: "text",
        placeholder: "如：25,000",
        defaultValue: "24,500"
      }
    ]
  },
  {
    id: "business-proposal",
    title: "立项合作提案书",
    description: "适用于项目合作、软件服务开发、企业咨询或采购项目的书面提案和初步方案。",
    category: "商业合同",
    contentTemplate: `项目合作方案提案书

一、 提案书概述
- 提案名称：{{project_name}}
- 客户（合作方）：{{client_name}}
- 承接服务方：{{company_name}}
- 提案日期：{{proposal_date}}

二、 执行摘要（Executive Summary）
  针对本项目的核心方向，我方秉持着负责专业的态度。我们深入评估了 {{client_name}} 提及的核心业务痛点。
  本项目计划主要为了实现：{{executive_summary}}。

三、 核心规划目标 (Objectives)
- 设定达成之阶段目标：{{objectives}}
- 项目执行总周期：{{timeline}}

四、 项目核心交付成果 (Deliverables)
- 成果一：{{deliverables}}
- 成果二：配套技术手册与完整的售后支持说明。

五、 项目预算与费用细目
  项目实施的总预算额度暂定位：人民币 {{budget}} 元整。该费用包含系统开发成本、服务器运行环境搭建、以及前期运维测试服务。

六、 咨询与联络信息
  本方案自提交之日起30天内有效。有关技术或合同细节的进一步讨论，请随时与我方联络。

承接单位：{{company_name}}
方案汇报人盖章：_____________________
方案呈送截止日期：{{proposal_date}}`,
    fields: [
      {
        key: "project_name",
        label: "方案提案名称",
        type: "text",
        placeholder: "如：智能办公OA系统重构提案",
        defaultValue: "智慧企业OA管理系统重构方案"
      },
      {
        key: "client_name",
        label: "客户（呈送方）",
        type: "text",
        placeholder: "目标客户名称",
        defaultValue: "新世纪实业集团"
      },
      {
        key: "company_name",
        label: "我方（公司名称）",
        type: "text",
        placeholder: "提案服务商名称",
        defaultValue: "创智数字解决方案有限公司"
      },
      {
        key: "proposal_date",
        label: "提案日期",
        type: "date",
        placeholder: "方案呈报日期",
        defaultValue: new Date().toISOString().split('T')[0]
      },
      {
        key: "executive_summary",
        label: "提案执行摘要",
        type: "textarea",
        placeholder: "简述方案解决哪些核心痛点...",
        defaultValue: "全面提升企业数字化协同效率，将各支线系统融为一体，依托高并发微服务架构，重构客户原有销售管理模块和报销流程，预期能实现人工审批流耗时降低50%以上。"
      },
      {
        key: "objectives",
        label: "项目核心目标",
        type: "textarea",
        placeholder: "需要实现哪些具体的业务目标...",
        defaultValue: "1. 30日内完成全新UI/UX界面的设计与核心流线跑通；\n2. 90日内完成整体系统数据库整合與分布式集群部署；\n3. 实现全平台多终端（移动端/电脑端）数据同步及时更新。"
      },
      {
        key: "timeline",
        label: "项目周期估算",
        type: "text",
        placeholder: "如：3个月 / 180个日历天",
        defaultValue: "120 个自然日"
      },
      {
        key: "deliverables",
        label: "核心交付成果",
        type: "textarea",
        placeholder: "明确的成果描述...",
        defaultValue: "开发定制化后台控制系统；交付 iOS & Android 客户端打包安装文件；部署基于云服务的安全数据库并移交底层核心说明文档。"
      },
      {
        key: "budget",
        label: "合作总预算 (元)",
        type: "text",
        placeholder: "如：150,000",
        defaultValue: "389,000"
      }
    ]
  },
  {
    id: "meeting-minutes",
    title: "政企商务会议会议纪要",
    description: "适用于团队周报会、项目总结汇报、股东大会、或者战略决议会议的模板纪要。",
    category: "日常办公",
    contentTemplate: `会议纪要 (Meeting Minutes)

一、 基础会议信息
- 会议主题：{{meeting_title}}
- 会议日期：{{date}}
- 主持人：{{host}}
- 记录人：{{recorder}}
- 参会人员范围：{{attendees}}

二、 讨论核心议程 (Agenda)
  针对本次会议，全体参会同仁充分交流，详细阐述。重点探讨了以下既定议程：
{{agenda}}

三、 会议决议事项 (Decisions Made)
  经现场多方评议表决，最终确立了下述核心决议：
{{decisions}}

四、 后续代办与任务分配 (Action Items)
  按会议安排，各条线负责人须严格按时保质完成以下跟进任务：
{{followups}}

五、 下次会议计划
  下次会议时间与地点另行通知。本报告副本由记录人报送各位领导及核心相关人员，以兹共同遵守。

会议主持人签名：_____________________
会议记录人确认：_____________________`,
    fields: [
      {
        key: "meeting_title",
        label: "会议主题",
        type: "text",
        placeholder: "如：二季度技术架构评审会",
        defaultValue: "Q3集团数字化转型暨新品发布筹备工作会"
      },
      {
        key: "date",
        label: "会议时间",
        type: "date",
        placeholder: "请选择会议举行日期",
        defaultValue: new Date().toISOString().split('T')[0]
      },
      {
        key: "host",
        label: "会议主持人",
        type: "text",
        placeholder: "主持人姓名",
        defaultValue: "王振国（运营副总裁）"
      },
      {
        key: "recorder",
        label: "会议记录人",
        type: "text",
        placeholder: "记录人姓名",
        defaultValue: "陈紫怡"
      },
      {
        key: "attendees",
        label: "与会人员",
        type: "text",
        placeholder: "参会人员姓名，逗号隔开",
        defaultValue: "王振国、林少杰、楚乔、刘海明、赵丹、周华"
      },
      {
        key: "agenda",
        label: "研讨议程",
        type: "textarea",
        placeholder: "列举研讨了哪些内容...",
        defaultValue: "1. 汇报Q2线上电商大促的技术运营数据及宕机事件复盘工作；\n2. 研讨Q3品牌新品线上发布会的具体直播架构与流量保障预案；\n3. 评估全线商品加入AI智能客服辅助助推订单率的可行性。"
      },
      {
        key: "decisions",
        label: "会议决议",
        type: "textarea",
        placeholder: "达成了哪些定论或决议...",
        defaultValue: "1. 通过了核心发布会保障方案，指定楚乔为新品项目技术总负责人；\n2. 决定于本月20日前，完成和第三方大流量网络宽带的联合压测工作；\n3. 审批同意引入AI智能助理模块，首期预算控制在5万元内。"
      },
      {
        key: "followups",
        label: "会后跟进事项",
        type: "textarea",
        placeholder: "谁在什么时限里落实何种工作...",
        defaultValue: "- 【楚乔】在 6月15日前 整理出技术演练的具体步骤和排班报备；\n- 【赵丹】于 6月18日前 编写AI助理客服的API对接及隐私合规自查表；\n- 【林少杰】负责 协调Q2财务表分析，提供销售指标修正方案。"
      }
    ]
  },
  {
    id: "weekly-report",
    title: "工作周报总结模板",
    description: "适用于团队或部门每日每周总结汇报。方便主管掌握核心进度，解决难题。",
    category: "日常办公",
    contentTemplate: `个人工作汇报周报 (Weekly Work Report)

基本背景信息：
- 汇报人：{{reporter_name}}
- 所属部门：{{department}}
- 周报范围段：{{week_dates}}

一、 本周工作任务达成记录 (Completed Tasks)
  本周总体工作高效向前，各项任务落地进展顺利。详细情况如下：
{{completed_tasks}}

二、 下周核心工作计划安排 (Upcoming Tasks)
  为确保业务良性循环与持续稳定产出，下周我方工作将重点集聚在：
{{pending_tasks}}

三、 精进建议、遗留问题与所需协调支持
  在执行相关流程中遇到了以下问题，需领导与跨部门团队予以关注支持：
{{issues_needs}}

汇报日期：{{week_dates}}`,
    fields: [
      {
        key: "reporter_name",
        label: "个人姓名",
        type: "text",
        placeholder: "汇报人",
        defaultValue: "陆晴轩"
      },
      {
        key: "department",
        label: "汇报部门",
        type: "text",
        placeholder: "所属科室/团队",
        defaultValue: "研发一部"
      },
      {
        key: "week_dates",
        label: "周报起止周期",
        type: "text",
        placeholder: "如：2026.06.01 - 2026.06.07",
        defaultValue: "2026.06.08 - 2026.06.14"
      },
      {
        key: "completed_tasks",
        label: "本周工作达成情况",
        type: "textarea",
        placeholder: "具体写完成的事项与指标...",
        defaultValue: "1. 成功上线修复移动端用户在网络切换状态下加载图片崩溃的闪退Bug；\n2. 开展了关于系统新后台数据库性能的参数调优工作，读取响应延迟下降了15%；\n3. 完成企业新后台Word文档排版和打印自动渲染代码段的技术验证。"
      },
      {
        key: "pending_tasks",
        label: "下周工作聚焦要点",
        type: "textarea",
        placeholder: "下周具体的工作规划与核心安排...",
        defaultValue: "1. 承接新大厅系统的接口联调测试，完成对等单元API加密校验；\n2. 协助市场部修复促销活动页面的动画加载卡顿问题；\n3. 参与周三下午的部门季度业务重构研讨会，发言准备。"
      },
      {
        key: "issues_needs",
        label: "需协调支持/遇到的瓶颈",
        type: "textarea",
        placeholder: "若有请在此列明，没有写“无”即可...",
        defaultValue: "由于当前联调环境下的测试服务器CPU配置偏低，下周高流量自动化测试时可能会遇到请求堵塞，希望能协调运维组周二下午提供一主两备测试环境做分流。"
      }
    ]
  }
];
