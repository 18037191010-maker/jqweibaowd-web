export interface TemplateField {
  key: string;
  label: string;
  type: "text" | "textarea" | "date" | "number" | "image";
  placeholder: string;
  defaultValue?: string;
  group?: string;
}

export interface DocumentTemplate {
  id: string;
  title: string;
  description: string;
  category: "行政人事" | "商业合同" | "日常办公" | "自定义";
  contentTemplate: string;
  htmlTemplate?: string; // Optional rich HTML structure from Mammoth for high-fidelity rendering
  fields: TemplateField[];
  docxBase64?: string; // Stored original docx file in base64 format for 100% high-fidelity docxtemplater filling
}

export interface SavedDocument {
  id: string;
  title: string;
  templateId: string;
  templateTitle: string;
  fieldValues: Record<string, string>;
  lastModified: string;
  customContent?: string; // Cache for customized generated output
}
