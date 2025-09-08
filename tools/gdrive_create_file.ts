import { google } from "googleapis";
import { GDriveCreateFileInput, InternalToolResponse } from "./types.js";
import { MCPFolderManager } from "./folder_manager.js";

export const schema = {
  name: "gdrive_create_file",
  description: "Create a new file in the MCP dedicated folder with content under 100MB",
  inputSchema: {
    type: "object",
    properties: {
      name: {
        type: "string",
        description: "Name of the file to create",
      },
      content: {
        type: "string",
        description: "Content to write to the file",
      },
      mimeType: {
        type: "string",
        description: "MIME type of the file (optional, defaults to text/plain)",
        optional: true,
      },
    },
    required: ["name", "content"],
  },
} as const;

const drive = google.drive("v3");

export async function createFile(
  args: GDriveCreateFileInput,
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

    // Get MCP folder ID
    const mcpFolderId = await MCPFolderManager.getMCPFolderId();

    // Set default MIME type if not provided
    const mimeType = args.mimeType || "text/plain";

    // Create the file
    const response = await drive.files.create({
      requestBody: {
        name: args.name,
        parents: [mcpFolderId],
        mimeType,
      },
      media: {
        mimeType,
        body: args.content,
      },
      fields: "id, name, size, mimeType, createdTime",
    });

    const fileData = response.data;
    const fileSizeInMB = fileData.size 
      ? Math.round((parseInt(fileData.size) / (1024 * 1024)) * 100) / 100 
      : sizeValidation.sizeInMB;

    return {
      content: [
        {
          type: "text",
          text: `File created successfully in MCP folder:
File ID: ${fileData.id}
Name: ${fileData.name}
Size: ${fileSizeInMB}MB
MIME Type: ${fileData.mimeType}
Created: ${fileData.createdTime}`,
        },
      ],
      isError: false,
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error creating file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
      isError: true,
    };
  }
}