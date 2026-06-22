export type PresalesFolderInput = {
  requestNumber: string;
  accountName: string;
  description: string;
  year?: number;
};

export type PresalesFolderReference = {
  folderPath: string;
  folderUrl: string;
};

export interface PresalesDocumentFolderService {
  designFolder(input: PresalesFolderInput): PresalesFolderReference;
}

export class PresalesDocumentFolderServiceStub implements PresalesDocumentFolderService {
  designFolder(input: PresalesFolderInput): PresalesFolderReference {
    const year = input.year ?? new Date().getFullYear();
    const folderName = `${input.requestNumber} ${input.accountName} ${input.description}`.replace(/[\\/:*?"<>|#%{}~&]/g, " ").replace(/\s+/g, " ").trim().slice(0, 140);
    const folderPath = `PreSales/${year}/${folderName}`;
    return {
      folderPath,
      folderUrl: `sharepoint://ConnectedHospitality/${folderPath}`
    };
  }
}

