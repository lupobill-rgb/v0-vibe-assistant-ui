/**
 * Project context interface for LLM diff generation
 */
export interface ProjectContext {
  /**
   * Map of file paths (relative to repo root) to their content.
   * Example: { "src/index.ts": "import ...\n...", "README.md": "# Project\n..." }
   */
  files: Record<string, string>;
}
