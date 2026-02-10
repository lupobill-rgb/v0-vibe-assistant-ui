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

// New validation result format
export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

const MAX_DIFF_SIZE = parseInt(process.env.MAX_DIFF_SIZE || '5000', 10);

/**
 * Sanitizes raw LLM output to extract the unified diff.
 * Finds the first occurrence of "diff --git " and returns content from there.
 * Removes markdown code fences if present.
 * Rejects output with commentary or explanatory text.
 * 
 * @param raw - Raw LLM output that may contain explanations, markdown, etc.
 * @returns Sanitized diff string or null if no valid diff header found or commentary detected
 */
export function sanitizeUnifiedDiff(raw: string): string | null {
  // Check for commentary patterns in the raw output before processing
  const lines = raw.split('\n');
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Skip empty lines
    if (trimmedLine.length === 0) continue;
    
    // If we've reached the diff, stop checking
    if (trimmedLine.startsWith('diff --git ')) break;
    
    // Check for common commentary patterns before the diff
    const commentaryPatterns = [
      /^Here's/i,
      /^Sure/i,
      /^I'll/i,
      /^Let me/i,
      /^I've/i,
      /^I have/i,
      /^This (diff|patch|change)/i,
      /^The (diff|patch|change)/i,
      /^Below is/i,
      /^Above is/i,
    ];
    
    for (const pattern of commentaryPatterns) {
      if (pattern.test(trimmedLine)) {
        return null;
      }
    }
  }

  // Find the first occurrence of "diff --git "
  const index = raw.indexOf('diff --git ');
  if (index === -1) {
    return null;
  }

  // Extract from that point to the end
  let result = raw.substring(index);

  // Trim leading/trailing whitespace
  result = result.trim();

  // Check if there are any ``` markers in the result (these shouldn't be in valid diffs)
  if (result.includes('```')) {
    // Only remove trailing ``` if it's at the very end (common LLM pattern)
    const lines = result.split('\n');
    const lastLine = lines[lines.length - 1].trim();
    if (lastLine === '```') {
      // Remove the last line
      lines.pop();
      result = lines.join('\n').trim();
    } else {
      // ``` appears somewhere else - this is invalid
      return null;
    }
  }

  // Final guard: Check for commentary still present in the diff
  const resultLines = result.split('\n');
  for (const line of resultLines) {
    const trimmedLine = line.trim();
    
    // Check for markdown code fences (these should not be in a valid diff)
    if (trimmedLine.startsWith('```')) {
      return null;
    }
    
    // Check for commentary patterns in the diff body
    // Skip lines that are valid diff elements
    if (trimmedLine.startsWith('diff --git ') || 
        trimmedLine.startsWith('---') || 
        trimmedLine.startsWith('+++') || 
        trimmedLine.startsWith('@@') ||
        trimmedLine.startsWith('+') ||
        trimmedLine.startsWith('-') ||
        trimmedLine.startsWith(' ') ||
        trimmedLine.length === 0) {
      continue;
    }
    
    // Any other non-empty line that doesn't match diff format is suspicious
    const commentaryPatterns = [
      /^Here's/i,
      /^Sure/i,
      /^I'll/i,
      /^Let me/i,
      /^I've/i,
      /^I have/i,
      /^This (diff|patch|change)/i,
      /^The (diff|patch|change)/i,
    ];
    
    for (const pattern of commentaryPatterns) {
      if (pattern.test(trimmedLine)) {
        return null;
      }
    }
  }

  return result;
}

/**
 * DiffValidator: Enforces unified diff format and rejects non-diff output
 * 
 * Responsibilities:
 * 1. Validates unified diff format (reject code blocks, explanations, etc.)
 * 2. Enforces size limits (hard cap at MAX_DIFF_SIZE lines)
 * 3. Performs git apply --check before allowing apply
 * 4. Fails fast with explicit error messages
 */

/**
 * Enhanced validation function that returns detailed error information.
 * For each diff block, ensures proper --- and +++ headers are present.
 * 
 * @param content - The diff content to validate
 * @returns ValidationResult with ok status and any errors found
 */
export function validateUnifiedDiffEnhanced(content: string): ValidationResult {
  const lines = content.split('\n');
  const errors: string[] = [];

  // Check hard cap on diff size
  if (lines.length > MAX_DIFF_SIZE) {
    return {
      ok: false,
      errors: [`Diff exceeds maximum size: ${lines.length} lines > ${MAX_DIFF_SIZE} lines`]
    };
  }

  // Must have at least some content
  if (lines.length < 3) {
    return {
      ok: false,
      errors: ['Diff is too short to be valid']
    };
  }

  // Check for any content before first "diff --git"
  const firstDiffIndex = lines.findIndex(line => line.startsWith('diff --git '));
  if (firstDiffIndex === -1) {
    return {
      ok: false,
      errors: ['Missing unified diff header (diff --git)']
    };
  }

  // Check if there's any non-empty content before the first diff
  for (let i = 0; i < firstDiffIndex; i++) {
    if (lines[i].trim().length > 0) {
      return {
        ok: false,
        errors: ['Diff contains content before the first diff --git header']
      };
    }
  }

  // Parse diff blocks and validate each one has proper headers
  const diffBlocks: { file: string; hasMinusHeader: boolean; hasPlusHeader: boolean; lineNumber: number }[] = [];
  let currentBlock: { file: string; hasMinusHeader: boolean; hasPlusHeader: boolean; lineNumber: number } | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('diff --git ')) {
      // Save previous block if exists
      if (currentBlock) {
        diffBlocks.push(currentBlock);
      }

      // Start new block
      const match = line.match(/^diff --git a\/(.+) b\/(.+)$/);
      const fileName = match ? match[1] : 'unknown';
      currentBlock = {
        file: fileName,
        hasMinusHeader: false,
        hasPlusHeader: false,
        lineNumber: i + 1
      };
    } else if (currentBlock) {
      if (line.startsWith('---')) {
        currentBlock.hasMinusHeader = true;
      } else if (line.startsWith('+++')) {
        currentBlock.hasPlusHeader = true;
      }
    }
  }

  // Save last block
  if (currentBlock) {
    diffBlocks.push(currentBlock);
  }

  // Check if we have any file blocks
  if (diffBlocks.length === 0) {
    return {
      ok: false,
      errors: ['Diff contains no file blocks']
    };
  }

  // Validate each block has required headers
  for (const block of diffBlocks) {
    if (!block.hasMinusHeader) {
      errors.push(`File block '${block.file}' (line ${block.lineNumber}) is missing --- header`);
    }
    if (!block.hasPlusHeader) {
      errors.push(`File block '${block.file}' (line ${block.lineNumber}) is missing +++ header`);
    }
  }

  // Check for code blocks or other non-diff content
  if (content.includes('```')) {
    errors.push('Diff contains code blocks or markdown formatting');
  }

  // Check for hunk markers
  const hasHunkMarkers = lines.some(line => line.startsWith('@@'));
  if (!hasHunkMarkers) {
    errors.push('Missing hunk markers (@@)');
  }

  // Check that diff ends with newline (after extractDiff normalization)
  if (!content.endsWith('\n')) {
    errors.push('Diff must end with newline');
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
        errors.push(`Invalid diff line at ${i + 1}: lines in hunks must start with +, -, or space`);
        break; // Only report first error of this type
      }
    }
  }

  return {
    ok: errors.length === 0,
    errors
  };
}

export function validateUnifiedDiff(content: string): DiffValidationResult {
  const lineCount = content.split('\n').length;
  
  // Use the enhanced validation
  const enhanced = validateUnifiedDiffEnhanced(content);
  
  return {
    valid: enhanced.ok,
    error: enhanced.errors.length > 0 ? enhanced.errors[0] : undefined,
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
    // Normalize line endings to LF (git patches require Unix-style line endings)
    // This prevents "corrupt patch" errors on Windows where CRLF might be used
    const normalizedDiff = diffContent.replace(/\r\n/g, '\n');
    // Explicitly use UTF-8 encoding to ensure consistent behavior across platforms
    fs.writeFileSync(tempFile, normalizedDiff, { encoding: 'utf-8' });

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
