import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const MAX_CONTEXT_SIZE = parseInt(process.env.MAX_CONTEXT_SIZE || '50000', 10);

export interface ContextResult {
  files: Map<string, string>;
  totalSize: number;
  truncated: boolean;
}

// Build deterministic context: ripgrep for files + 1-hop import resolution
export async function buildContext(repoPath: string, prompt: string): Promise<ContextResult> {
  const files = new Map<string, string>();
  let totalSize = 0;
  let truncated = false;

  // Step 1: Use ripgrep to find relevant files based on keywords from prompt
  const keywords = extractKeywords(prompt);
  const discoveredFiles = new Set<string>();

  // Search for each keyword
  for (const keyword of keywords) {
    try {
      const rgResult = execSync(
        `rg -l "${keyword}" --type-add 'code:*.{js,ts,jsx,tsx,py,go,java,c,cpp,h,hpp}' -t code`,
        { cwd: repoPath, encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 }
      );
      
      const foundFiles = rgResult.trim().split('\n').filter(f => f);
      foundFiles.forEach(f => discoveredFiles.add(f));
    } catch (error) {
      // No matches for this keyword, continue
    }
  }

  // If no files found, include common entry points
  if (discoveredFiles.size === 0) {
    const commonEntries = [
      'index.js', 'index.ts', 'main.js', 'main.ts', 'app.js', 'app.ts',
      'src/index.js', 'src/index.ts', 'src/main.js', 'src/main.ts'
    ];
    
    for (const entry of commonEntries) {
      const fullPath = path.join(repoPath, entry);
      if (fs.existsSync(fullPath)) {
        discoveredFiles.add(entry);
        break;
      }
    }
  }

  // Sort files alphabetically for deterministic ordering
  const sortedFiles = Array.from(discoveredFiles).sort();

  // Step 2: For each file, add its content and resolve 1-hop imports
  const processedFiles = new Set<string>();
  
  for (const filePath of sortedFiles) {
    if (totalSize >= MAX_CONTEXT_SIZE) {
      truncated = true;
      break;
    }

    await addFileWithImports(repoPath, filePath, files, processedFiles, totalSize);
    totalSize = Array.from(files.values()).reduce((sum, content) => sum + content.length, 0);
  }

  return { files, totalSize, truncated };
}

async function addFileWithImports(
  repoPath: string,
  filePath: string,
  files: Map<string, string>,
  processedFiles: Set<string>,
  currentSize: number
): Promise<void> {
  if (processedFiles.has(filePath) || currentSize >= MAX_CONTEXT_SIZE) {
    return;
  }

  const fullPath = path.join(repoPath, filePath);
  if (!fs.existsSync(fullPath)) {
    return;
  }

  const stat = fs.statSync(fullPath);
  if (!stat.isFile()) {
    return;
  }

  // Read file content
  let content: string;
  try {
    content = fs.readFileSync(fullPath, 'utf-8');
  } catch (error) {
    return; // Skip files we can't read
  }

  files.set(filePath, content);
  processedFiles.add(filePath);

  // Parse imports (1-hop only)
  const imports = parseImports(content, filePath);
  
  for (const importPath of imports) {
    if (currentSize >= MAX_CONTEXT_SIZE) {
      break;
    }

    const resolvedPath = resolveImportPath(repoPath, filePath, importPath);
    if (resolvedPath && !processedFiles.has(resolvedPath)) {
      await addFileWithImports(repoPath, resolvedPath, files, processedFiles, currentSize);
      currentSize = Array.from(files.values()).reduce((sum, c) => sum + c.length, 0);
    }
  }
}

function extractKeywords(prompt: string): string[] {
  // Extract meaningful words (longer than 3 chars, not common words)
  const commonWords = new Set(['the', 'this', 'that', 'with', 'from', 'for', 'and', 'or']);
  const words = prompt.toLowerCase().match(/\b[a-z]{4,}\b/g) || [];
  return words.filter(w => !commonWords.has(w)).slice(0, 5); // Top 5 keywords
}

function parseImports(content: string, filePath: string): string[] {
  const imports: string[] = [];
  const ext = path.extname(filePath);

  if (['.js', '.jsx', '.ts', '.tsx'].includes(ext)) {
    // JavaScript/TypeScript imports
    const importRegex = /import\s+.*?from\s+['"](.+?)['"]/g;
    const requireRegex = /require\(['"](.+?)['"]\)/g;
    
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }
    while ((match = requireRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }
  } else if (ext === '.py') {
    // Python imports
    const importRegex = /(?:from\s+(\S+)\s+import|import\s+(\S+))/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      const module = match[1] || match[2];
      if (module && !module.startsWith('.')) {
        continue; // Skip stdlib/external packages
      }
      imports.push(module);
    }
  }

  return imports;
}

function resolveImportPath(repoPath: string, fromFile: string, importPath: string): string | null {
  // Skip external packages
  if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
    return null;
  }

  const fromDir = path.dirname(fromFile);
  let resolved = path.normalize(path.join(fromDir, importPath));

  // Try different extensions
  const extensions = ['', '.js', '.ts', '.jsx', '.tsx', '.py', '/index.js', '/index.ts'];
  
  for (const ext of extensions) {
    const candidate = resolved + ext;
    const fullPath = path.join(repoPath, candidate);
    
    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
      return candidate;
    }
  }

  return null;
}

export function formatContext(files: Map<string, string>): string {
  // Sort by filename for deterministic output
  const sortedEntries = Array.from(files.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  
  let context = '';
  for (const [filePath, content] of sortedEntries) {
    context += `\n--- ${filePath} ---\n${content}\n`;
  }

  return context;
}
