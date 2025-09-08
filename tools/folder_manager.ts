import { google } from "googleapis";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const drive = google.drive("v3");
const MCP_FOLDER_NAME = "MCP-Files";
const FOLDER_ID_CACHE_FILE = path.join(os.homedir(), ".mcp-gdrive-folder-id");

export class MCPFolderManager {
  private static folderIdCache: string | null = null;

  /**
   * Get or create the MCP dedicated folder
   */
  static async getMCPFolderId(): Promise<string> {
    // Return cached ID if available
    if (this.folderIdCache) {
      return this.folderIdCache;
    }

    // Try to load from disk cache
    try {
      if (fs.existsSync(FOLDER_ID_CACHE_FILE)) {
        const cachedId = fs.readFileSync(FOLDER_ID_CACHE_FILE, 'utf8').trim();
        if (await this.verifyFolderExists(cachedId)) {
          this.folderIdCache = cachedId;
          return cachedId;
        }
      }
    } catch (error) {
      console.warn('Failed to load cached folder ID:', error);
    }

    // Search for existing MCP folder
    const existingFolder = await this.findMCPFolder();
    if (existingFolder) {
      this.folderIdCache = existingFolder;
      this.saveFolderIdToCache(existingFolder);
      return existingFolder;
    }

    // Create new MCP folder
    const newFolderId = await this.createMCPFolder();
    this.folderIdCache = newFolderId;
    this.saveFolderIdToCache(newFolderId);
    return newFolderId;
  }

  /**
   * Verify that a folder ID still exists and is accessible
   */
  private static async verifyFolderExists(folderId: string): Promise<boolean> {
    try {
      const response = await drive.files.get({
        fileId: folderId,
        fields: 'id,name,mimeType,trashed'
      });
      
      return response.data.mimeType === 'application/vnd.google-apps.folder' && 
             !response.data.trashed;
    } catch (error) {
      return false;
    }
  }

  /**
   * Search for existing MCP folder
   */
  private static async findMCPFolder(): Promise<string | null> {
    try {
      const response = await drive.files.list({
        q: `name='${MCP_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: 'files(id, name)',
        pageSize: 1
      });

      if (response.data.files && response.data.files.length > 0) {
        return response.data.files[0].id!;
      }
      return null;
    } catch (error) {
      console.warn('Failed to search for MCP folder:', error);
      return null;
    }
  }

  /**
   * Create new MCP folder
   */
  private static async createMCPFolder(): Promise<string> {
    const response = await drive.files.create({
      requestBody: {
        name: MCP_FOLDER_NAME,
        mimeType: 'application/vnd.google-apps.folder'
      },
      fields: 'id'
    });

    if (!response.data.id) {
      throw new Error('Failed to create MCP folder');
    }

    return response.data.id;
  }

  /**
   * Save folder ID to disk cache
   */
  private static saveFolderIdToCache(folderId: string): void {
    try {
      fs.writeFileSync(FOLDER_ID_CACHE_FILE, folderId, 'utf8');
    } catch (error) {
      console.warn('Failed to cache folder ID:', error);
    }
  }

  /**
   * Validate that a file belongs to the MCP folder
   */
  static async validateFileInMCPFolder(fileId: string): Promise<boolean> {
    try {
      const mcpFolderId = await this.getMCPFolderId();
      const response = await drive.files.get({
        fileId,
        fields: 'parents'
      });

      return response.data.parents?.includes(mcpFolderId) || false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Validate content size (100MB limit)
   */
  static validateContentSize(content: string): { valid: boolean; sizeInMB: number } {
    const sizeInBytes = Buffer.byteLength(content, 'utf8');
    const sizeInMB = sizeInBytes / (1024 * 1024);
    const maxSizeInMB = 100;

    return {
      valid: sizeInMB <= maxSizeInMB,
      sizeInMB: Math.round(sizeInMB * 100) / 100
    };
  }
}