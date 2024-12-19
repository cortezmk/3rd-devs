declare module 'pdf-poppler' {
  interface ConvertOptions {
    format: 'png' | 'jpeg' | 'tiff';
    out_dir: string;
    out_prefix: string;
    page?: number;
    scale?: number;
  }

  export function convert(pdfPath: string, options: ConvertOptions): Promise<void>;
}