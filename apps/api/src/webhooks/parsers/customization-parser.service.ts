import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface ParsedCustomization {
  customizationData: Record<string, string>;
  fileUploads: Array<{ url: string; name: string; type: string }>;
}

@Injectable()
export class CustomizationParserService {
  private s3Domain: string;

  constructor(private readonly config: ConfigService) {
    const s3Endpoint = this.config.get<string>('s3.endpoint') || '';
    const s3Bucket = this.config.get<string>('s3.bucket') || '';
    this.s3Domain = `${s3Endpoint}/${s3Bucket}`;
  }

  /**
   * Parse Shopify line item properties into file uploads and text customizations.
   * Line item properties come as: [{name: "Upload Your Photo", value: "https://s3.../photo.jpg"}, ...]
   */
  parse(properties: Array<{ name: string; value: string }>): ParsedCustomization {
    const customizationData: Record<string, string> = {};
    const fileUploads: Array<{ url: string; name: string; type: string }> = [];

    if (!properties || !Array.isArray(properties)) {
      return { customizationData, fileUploads };
    }

    for (const prop of properties) {
      // Skip internal Shopify properties (prefixed with _)
      if (prop.name.startsWith('_')) continue;

      if (this.isFileUrl(prop.value)) {
        const extension = prop.value.split('.').pop()?.toLowerCase() || '';
        const type = this.getMimeType(extension);
        fileUploads.push({
          url: prop.value,
          name: prop.name,
          type,
        });
      } else {
        customizationData[prop.name] = prop.value;
      }
    }

    return { customizationData, fileUploads };
  }

  private isFileUrl(value: string): boolean {
    if (!value) return false;
    // Check if it's a URL pointing to our S3 storage or common file hosting
    if (value.includes(this.s3Domain)) return true;
    // Also detect common image/file URL patterns
    const fileExtensions = /\.(jpg|jpeg|png|gif|webp|svg|pdf|ai|psd|eps|tiff?)$/i;
    try {
      const url = new URL(value);
      return fileExtensions.test(url.pathname);
    } catch {
      return false;
    }
  }

  private getMimeType(extension: string): string {
    const mimeMap: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      svg: 'image/svg+xml',
      pdf: 'application/pdf',
      ai: 'application/illustrator',
      psd: 'image/vnd.adobe.photoshop',
      eps: 'application/postscript',
      tif: 'image/tiff',
      tiff: 'image/tiff',
    };
    return mimeMap[extension] || 'application/octet-stream';
  }
}
