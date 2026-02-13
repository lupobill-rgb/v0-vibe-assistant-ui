export interface ProjectContext {
  files: Record<string, string>;
  totalSize: number;
  truncated: boolean;
  repoPath: string;
  prompt: string;
}

/**
 * Gather project context by converting ContextResult to ProjectContext
 */
export function gatherProjectContext(
  repoPath: string,
  prompt: string,
  files: Map<string, string>,
  totalSize: number,
  truncated: boolean
): ProjectContext {
  // Convert Map to Record
  const filesRecord: Record<string, string> = {};
  files.forEach((content, filePath) => {
    filesRecord[filePath] = content;
  });

  return {
    files: filesRecord,
    totalSize,
    truncated,
    repoPath,
    prompt
  };
}

/**
 * Get list of file paths from ProjectContext
 */
export function getContextFiles(context: ProjectContext): string[] {
  return Object.keys(context.files).sort();
}

/**
 * Get file content from ProjectContext
 */
export function getFileContent(context: ProjectContext, filePath: string): string | undefined {
  return context.files[filePath];
}

/**
 * Check if a file exists in the context
 */
export function hasFile(context: ProjectContext, filePath: string): boolean {
  return filePath in context.files;
}
