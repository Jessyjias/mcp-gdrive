import { google } from "googleapis";
import { GDriveWriteFileInput, InternalToolResponse } from "./types.js";
import { MCPFolderManager } from "./folder_manager.js";

export const schema = {
  name: "gdrive_write_file",
  description: "Write content to an existing file in the MCP folder (replaces existing content)",
  inputSchema: {
    type: "object",
    properties: {
      fileId: {
        type: "string",
        description: "ID of the file to write to (must be in MCP folder)",
      },
      content: {
        type: "string",
        description: "Content to write to the file (replaces existing content)",
      },
    },
    required: ["fileId", "content"],
  },
} as const;

const drive = google.drive("v3");

export async function writeFile(
  args: GDriveWriteFileInput,
): Promise<InternalToolResponse> {
  try {
    // Validate content size
    const sizeValidation = MCPFolderManager.validateContentSize(args.content);
    if (!sizeValidation.valid) {
      return {
        content: [
          {
            type: "text",
            text: `Error: File content too large (${sizeValidation.sizeInMB}MB). Maximum allowed size is 100MB.`,
          },
        ],
        isError: true,
      };
    }

    // Verify file is in MCP folder
    const isInMCPFolder = await MCPFolderManager.validateFileInMCPFolder(args.fileId);
    if (!isInMCPFolder) {
      return {
        content: [
          {
            type: "text",
            text: `Error: File ${args.fileId} is not in the MCP folder or does not exist. Only files in the MCP folder can be modified.`,
          },
        ],
        isError: true,
      };
    }

    // Get file info first
    const fileInfo = await drive.files.get({
      fileId: args.fileId,
      fields: "name, mimeType"
    });

    // Update the file content
    const response = await drive.files.update({
      fileId: args.fileId,
      media: {
        mimeType: fileInfo.data.mimeType || "text/plain",
        body: args.content,
      },
      fields: "id, name, size, mimeType, modifiedTime",
    });

    const fileData = response.data;
    const fileSizeInMB = fileData.size 
      ? Math.round((parseInt(fileData.size) / (1024 * 1024)) * 100) / 100 
      : sizeValidation.sizeInMB;

    return {
      content: [
        {
          type: "text",
          text: `File updated successfully:
File ID: ${fileData.id}
Name: ${fileData.name}
Size: ${fileSizeInMB}MB
MIME Type: ${fileData.mimeType}
Modified: ${fileData.modifiedTime}`,
        },
      ],
      isError: false,
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error writing to file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
      isError: true,
    };
  }
}