import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Validates that LLM output is a proper unified diff
export interface DiffValidationResult {
  valid: boolean;
  error?: string;
  lineCount?: number;
}

const MAX_DIFF_SIZE = parseInt(process.env.MAX_DIFF_SIZE || '5000', 10);

/**
 * DiffValidator: Enforces unified diff format and rejects non-diff output
 * 
 * Responsibilities:
 * 1. Validates unified diff format (reject code blocks, explanations, etc.)
 * 2. Enforces size limits (hard cap at MAX_DIFF_SIZE lines)
 * 3. Performs git apply --check before allowing apply
 * 4. Fails fast with explicit error messages
 */

export function validateUnifiedDiff(content: string): DiffValidationResult {
  const lines = content.split('\n');
  const lineCount = lines.length;

  // Check hard cap on diff size
  if (lineCount > MAX_DIFF_SIZE) {
    return {
      valid: false,
      error: `Diff exceeds maximum size: ${lineCount} lines > ${MAX_DIFF_SIZE} lines`,
      lineCount
    };
  }

  // Must have at least some content
  if (lineCount < 3) {
    return {
      valid: false,
      error: 'Diff is too short to be valid',
      lineCount
    };
  }

  // Check for unified diff markers
  const hasDiffMarker = lines.some(line => line.startsWith('diff --git '));
  const hasFileMarkers = lines.some(line => line.startsWith('+++') || line.startsWith('---'));
  const hasHunkMarkers = lines.some(line => line.startsWith('@@'));

  if (!hasDiffMarker) {
    return {
      valid: false,
      error: 'Missing unified diff header (diff --git)',
      lineCount
    };
  }

  if (!hasFileMarkers) {
    return {
      valid: false,
      error: 'Missing file markers (+++ or ---)',
      lineCount
    };
  }

  if (!hasHunkMarkers) {
    return {
      valid: false,
      error: 'Missing hunk markers (@@)',
      lineCount
    };
  }

  // Check for code blocks or other non-diff content
  const hasCodeBlock = content.includes('```');
  if (hasCodeBlock) {
    return {
      valid: false,
      error: 'Diff contains code blocks or markdown formatting',
      lineCount
    };
  }

  // Basic structure validation: check that +/- lines follow proper format
  let inHunk = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (line.startsWith('@@')) {
      inHunk = true;
      continue;
    }

    if (line.startsWith('diff --git ')) {
      inHunk = false;
      continue;
    }

    // In hunk, lines should start with +, -, or space (or be empty)
    if (inHunk && line.length > 0) {
      const firstChar = line[0];
      if (firstChar !== '+' && firstChar !== '-' && firstChar !== ' ' && firstChar !== '\\') {
        // Allow \ for "\ No newline at end of file"
        return {
          valid: false,
          error: `Invalid diff line at ${i + 1}: lines in hunks must start with +, -, or space`,
          lineCount
        };
      }
    }
  }

  return {
    valid: true,
    lineCount
  };
}

/**
 * Validates that a diff can be applied to a repository using git apply --check
 * This is a critical safety check before actually applying changes
 * 
 * @param diffContent - The unified diff content to validate
 * @param repoPath - Path to the git repository
 * @returns DiffValidationResult with validation status
 */
export function validateDiffApplicability(diffContent: string, repoPath: string): DiffValidationResult {
  let tempFile: string | null = null;
  
  try {
    // Create temporary file for diff
    tempFile = path.join(os.tmpdir(), `vibe-check-${Date.now()}.patch`);
    // Explicitly use UTF-8 encoding to ensure consistent behavior across platforms
    fs.writeFileSync(tempFile, diffContent, { encoding: 'utf-8' });

    // Run git apply --check (doesn't modify files, just validates)
    execSync(`git apply --check "${tempFile}"`, {
      cwd: repoPath,
      encoding: 'utf-8',
      stdio: 'pipe'
    });

    return {
      valid: true
    };

  } catch (error: any) {
    // git apply --check failed
    const errorOutput = error.stderr || error.stdout || error.message;
    return {
      valid: false,
      error: `Diff cannot be applied: ${errorOutput.trim()}`
    };

  } finally {
    // Clean up temp file
    if (tempFile && fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }
  }
}

/**
 * Normalizes content by removing leading whitespace and ensuring exactly one trailing newline.
 * Git patches require a trailing newline, so this function ensures consistent formatting.
 * 
 * @param content - The content to normalize
 * @returns The normalized content with leading whitespace removed and exactly one trailing newline
 */
function normalizeContent(content: string): string {
  // Remove leading whitespace but preserve trailing
  let normalized = content.trimStart();
  // Ensure exactly one trailing newline (git patches require this)
  normalized = normalized.replace(/\n*$/, '\n');
  return normalized;
}

// Extract clean diff from LLM response (remove markdown, explanations, etc.)
export function extractDiff(llmResponse: string): string {
  // If response contains code blocks, try to extract diff from them
  const codeBlockRegex = /```(?:diff)?\n([\s\S]*?)```/g;
  const matches = Array.from(llmResponse.matchAll(codeBlockRegex));
  
  if (matches.length > 0) {
    // Return first code block content, normalized
    return normalizeContent(matches[0][1]);
  }

  // Otherwise return as-is (will be validated), normalized
  return normalizeContent(llmResponse);
}
