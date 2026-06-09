import React, { useState, useEffect } from "react";
import Header from "./components/Header";
import TemplateSelector from "./components/TemplateSelector";
import VariableInputForm from "./components/VariableInputForm";
import DocumentViewer from "./components/DocumentViewer";
import CustomTemplateWizard from "./components/CustomTemplateWizard";
import { DEFAULT_TEMPLATES } from "./templatesData";
import { DocumentTemplate } from "./types";

export default function App() {
  const [templates, setTemplates] = useState<DocumentTemplate[]>(DEFAULT_TEMPLATES);
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate>(DEFAULT_TEMPLATES[0]);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [isCustomWizardOpen, setIsCustomWizardOpen] = useState(false);

  // 1. Load custom templates from localStorage on initialization
  useEffect(() => {
    const saved = localStorage.getItem("doc_generator_custom_templates");
    if (saved) {
      try {
        const parsed: DocumentTemplate[] = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setTemplates((prev) => {
            const existingIds = new Set(DEFAULT_TEMPLATES.map((t) => t.id));
            const uniqueCustom = parsed.filter((t) => {
              if (existingIds.has(t.id)) {
                return false;
              }
              existingIds.add(t.id);
              return true;
            });
            return [...DEFAULT_TEMPLATES, ...uniqueCustom];
          });
        }
      } catch (err) {
        console.error("Failed to parse stored custom templates:", err);
      }
    }
  }, []);

  // 2. Set default values whenever selectedTemplate changes
  useEffect(() => {
    const defaultVals: Record<string, string> = {};
    selectedTemplate.fields.forEach((field) => {
      // In case date inputs are blank, we can pre-populate with today's date
      if (field.type === "date" && !field.defaultValue) {
        defaultVals[field.key] = new Date().toISOString().split("T")[0];
      } else {
        defaultVals[field.key] = field.defaultValue || "";
      }
    });
    setFieldValues(defaultVals);
  }, [selectedTemplate]);

  const handleSelectTemplate = (template: DocumentTemplate) => {
    setSelectedTemplate(template);
  };

  const handleValueChange = (key: string, value: string) => {
    setFieldValues((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleAutoFillSuccess = (extractedValues: Record<string, string>) => {
    // Keep values that are present, fill others dynamically with a nice touch!
    setFieldValues((prev) => {
      const updated = { ...prev };
      Object.keys(extractedValues).forEach((key) => {
        // Ensure values correspond to a valid field key inside current template
        const isValidField = selectedTemplate.fields.some((f) => f.key === key);
        if (isValidField) {
          updated[key] = extractedValues[key];
        }
      });
      return updated;
    });
  };

  const handleSaveCustomTemplate = (newTemplate: DocumentTemplate) => {
    // Save to State (ensure no duplicate IDs)
    setTemplates((prev) => {
      if (prev.some((t) => t.id === newTemplate.id)) {
        return prev;
      }
      return [...prev, newTemplate];
    });
    
    // Save to localStorage
    try {
      const saved = localStorage.getItem("doc_generator_custom_templates");
      let customList: DocumentTemplate[] = [];
      if (saved) {
        customList = JSON.parse(saved);
      }
      // Ensure we don't save duplicate template ID in localStorage either
      if (!customList.some((t) => t.id === newTemplate.id)) {
        customList.push(newTemplate);
        localStorage.setItem("doc_generator_custom_templates", JSON.stringify(customList));
      }
    } catch (err) {
      console.error("Failed to store custom template inside localStorage:", err);
    }

    // Active switch to this new parsed custom template
    setSelectedTemplate(newTemplate);
  };

  const handleDeleteTemplate = (idToDelete: string) => {
    // 1. Filter out from state
    setTemplates((prev) => {
      const updated = prev.filter((t) => t.id !== idToDelete);
      
      // 2. Adjust selection if active template was deleted
      if (selectedTemplate.id === idToDelete) {
        setSelectedTemplate(updated[0] || DEFAULT_TEMPLATES[0]);
      }
      return updated;
    });

    // 3. Remove/Filter out of localStorage
    try {
      const saved = localStorage.getItem("doc_generator_custom_templates");
      if (saved) {
        const customList: DocumentTemplate[] = JSON.parse(saved);
        const filteredList = customList.filter((t) => t.id !== idToDelete);
        localStorage.setItem("doc_generator_custom_templates", JSON.stringify(filteredList));
      }
    } catch (err) {
      console.error("Failed to remove custom template from localStorage:", err);
    }
  };

  const handleResetValues = () => {
    const defaultVals: Record<string, string> = {};
    selectedTemplate.fields.forEach((field) => {
      if (field.type === "date") {
        defaultVals[field.key] = field.defaultValue || new Date().toISOString().split("T")[0];
      } else {
        defaultVals[field.key] = field.defaultValue || "";
      }
    });
    setFieldValues(defaultVals);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Header />

      <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8" id="app-main">
        {/* Main Workspace split in two colums */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left panel - Selection & Form Control Panel */}
          <div className="lg:col-span-5 flex flex-col gap-6" id="panel-controls">
            <TemplateSelector
              templates={templates}
              selectedTemplateId={selectedTemplate.id}
              onSelectTemplate={handleSelectTemplate}
              onOpenCustomWizard={() => setIsCustomWizardOpen(true)}
              onDeleteTemplate={handleDeleteTemplate}
            />

            <VariableInputForm
              fields={selectedTemplate.fields}
              values={fieldValues}
              onValueChange={handleValueChange}
              onResetValues={handleResetValues}
            />
          </div>

          {/* Right panel - Full Paper Preview & Export Actions */}
          <div className="lg:col-span-7 h-[calc(100vh-140px)] min-h-[600px] lg:sticky lg:top-6" id="panel-viewer">
            <DocumentViewer
              template={selectedTemplate}
              values={fieldValues}
            />
          </div>

        </div>
      </main>

      {/* App Status Bar */}
      <footer className="h-9 bg-slate-900 border-t border-slate-800 text-slate-400 text-[10px] flex items-center justify-between px-6 shrink-0 font-mono select-none">
        <div className="flex items-center gap-4">
          <span>云端数据库已就绪 (实时同步)</span>
          <span className="hidden sm:inline text-slate-600">|</span>
          <span className="hidden sm:inline">文档引擎: v4.2-stable</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            网络正常
          </span>
          <span className="hidden sm:inline text-slate-600">|</span>
          <span className="uppercase tracking-tighter">UTF-8 / A4 PAPER / COMPREHENSIVE</span>
        </div>
      </footer>

      {/* AI Custom template builder dialog */}
      {isCustomWizardOpen && (
        <CustomTemplateWizard
          onClose={() => setIsCustomWizardOpen(false)}
          onSaveTemplate={handleSaveCustomTemplate}
        />
      )}
    </div>
  );
}
