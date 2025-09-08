import { schema as gdriveSearchSchema, search } from './gdrive_search.js';
import { schema as gdriveReadFileSchema, readFile } from './gdrive_read_file.js';
import { schema as gsheetsUpdateCellSchema, updateCell } from './gsheets_update_cell.js';
import { schema as gsheetsReadSchema, readSheet } from './gsheets_read.js';
import { schema as gdriveCreateFileSchema, createFile } from './gdrive_create_file.js';
import { schema as gdriveWriteFileSchema, writeFile } from './gdrive_write_file.js';
import { schema as gdriveListMCPFilesSchema, listMCPFiles } from './gdrive_list_mcp_files.js';
export const tools = [
    {
        ...gdriveSearchSchema,
        handler: search,
    },
    {
        ...gdriveReadFileSchema,
        handler: readFile,
    },
    {
        ...gsheetsUpdateCellSchema,
        handler: updateCell,
    },
    {
        ...gsheetsReadSchema,
        handler: readSheet,
    },
    {
        ...gdriveCreateFileSchema,
        handler: createFile,
    },
    {
        ...gdriveWriteFileSchema,
        handler: writeFile,
    },
    {
        ...gdriveListMCPFilesSchema,
        handler: listMCPFiles,
    }
];
