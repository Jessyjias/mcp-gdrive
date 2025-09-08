import { google } from "googleapis";
import { GDriveListMCPFilesInput, InternalToolResponse } from "./types.js";
import { MCPFolderManager } from "./folder_manager.js";

export const schema = {
  name: "gdrive_list_mcp_files",
  description: "List files in the MCP dedicated folder",
  inputSchema: {
    type: "object",
    properties: {
      pageToken: {
        type: "string",
        description: "Token for the next page of results",
        optional: true,
      },
      pageSize: {
        type: "number",
        description: "Number of results per page (max 100)",
        optional: true,
      },
    },
    required: [],
  },
} as const;

const drive = google.drive("v3");

export async function listMCPFiles(
  args: GDriveListMCPFilesInput,
): Promise<InternalToolResponse> {
  try {
    // Get MCP folder ID
    const mcpFolderId = await MCPFolderManager.getMCPFolderId();

    // List files in the MCP folder
    const response = await drive.files.list({
      q: `'${mcpFolderId}' in parents and trashed=false`,
      pageSize: args.pageSize || 10,
      pageToken: args.pageToken,
      orderBy: "modifiedTime desc",
      fields: "nextPageToken, files(id, name, mimeType, size, createdTime, modifiedTime)",
    });

    const files = response.data.files || [];
    
    if (files.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: "No files found in MCP folder.",
          },
        ],
        isError: false,
      };
    }

    // Format file list
    const fileList = files.map((file) => {
      const sizeInMB = file.size 
        ? Math.round((parseInt(file.size) / (1024 * 1024)) * 100) / 100 
        : 'Unknown';
      
      return `${file.id} | ${file.name} | ${file.mimeType} | ${sizeInMB}MB | Modified: ${file.modifiedTime}`;
    }).join("\n");

    let response_text = `Found ${files.length} files in MCP folder:\n\nID | Name | MIME Type | Size | Modified\n${'-'.repeat(80)}\n${fileList}`;

    // Add pagination info if there are more results
    if (response.data.nextPageToken) {
      response_text += `\n\nMore results available. Use pageToken: ${response.data.nextPageToken}`;
    }

    return {
      content: [
        {
          type: "text",
          text: response_text,
        },
      ],
      isError: false,
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error listing MCP files: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
      isError: true,
    };
  }
}