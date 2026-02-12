import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as crypto from 'crypto';

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly endpoint: string;

  constructor(private readonly config: ConfigService) {
    this.endpoint = this.config.get<string>('s3.endpoint')!;
    this.bucket = this.config.get<string>('s3.bucket')!;

    this.s3 = new S3Client({
      endpoint: this.endpoint,
      region: this.config.get<string>('s3.region'),
      credentials: {
        accessKeyId: this.config.get<string>('s3.accessKey')!,
        secretAccessKey: this.config.get<string>('s3.secretKey')!,
      },
      forcePathStyle: true, // Required for MinIO
    });
  }

  /**
   * Generate a presigned URL for client-side direct upload.
   */
  async getPresignedUploadUrl(
    folder: string,
    filename: string,
    contentType: string,
  ): Promise<{ uploadUrl: string; fileUrl: string; key: string }> {
    const ext = filename.split('.').pop() || 'bin';
    const key = `${folder}/${crypto.randomUUID()}.${ext}`;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(this.s3, command, { expiresIn: 3600 });
    const fileUrl = `${this.endpoint}/${this.bucket}/${key}`;

    return { uploadUrl, fileUrl, key };
  }
}
