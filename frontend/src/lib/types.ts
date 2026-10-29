export interface Template {
  id: string;
  title: string;
  category: string;
  coverUrl: string;
  description: string;
  requiredImageCount: number;
  acceptedMimeTypes: string[];
  maxFileSizeBytes: number;
}

export interface User { id: string; demoKey: string; displayName: string; }
export interface Asset { id: string; previewUrl: string; mimeType: string; sizeBytes: number; }
