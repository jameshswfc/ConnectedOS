import type { DocumentStorageProvider } from "@prisma/client";

export type DocumentMetadataInput = {
  fileName: string;
  fileType?: string;
  sizeBytes?: number;
  entityType?: string;
  entityId?: string;
  uploadedById?: string;
};

export type StoredDocumentReference = {
  storageProvider: DocumentStorageProvider;
  externalId?: string;
  fileName: string;
};

export interface DocumentStorageService {
  createMetadata(input: DocumentMetadataInput): Promise<StoredDocumentReference>;
  getAccessUrl(documentId: string, userId: string): Promise<string>;
}

export class SharePointDocumentServiceStub implements DocumentStorageService {
  async createMetadata(input: DocumentMetadataInput): Promise<StoredDocumentReference> {
    return {
      storageProvider: "sharepoint",
      fileName: input.fileName
    };
  }

  async getAccessUrl(): Promise<string> {
    throw new Error("SharePoint access URLs are deferred until Microsoft Graph integration is implemented.");
  }
}
