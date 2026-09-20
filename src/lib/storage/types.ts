export type StoredFile = {
  /** Provider-specific identifier persisted as materials.storage_file_id */
  id: string;
  name: string;
  mimeType: string;
  size: number;
  /** Optional provider URL (e.g. a Drive preview link). Never required by the UI. */
  webViewUrl?: string | null;
};

export type UploadInput = {
  data: Buffer;
  fileName: string;
  mimeType: string;
  /** Logical folder path, e.g. ["7th Semester", "Information Security", "Lecture Notes"] */
  folderPath: string[];
};

export type FileContent = {
  body: ReadableStream<Uint8Array> | Buffer;
  mimeType: string;
  size?: number;
};

export interface StorageProvider {
  /** Stable identifier persisted as materials.storage_provider */
  readonly name: string;
  isConfigured(): boolean;
  upload(input: UploadInput): Promise<StoredFile>;
  getContent(id: string): Promise<FileContent>;
  getMetadata(id: string): Promise<StoredFile | null>;
  delete(id: string): Promise<void>;
}

export class StorageError extends Error {
  constructor(
    message: string,
    readonly status = 500,
  ) {
    super(message);
    this.name = "StorageError";
  }
}
