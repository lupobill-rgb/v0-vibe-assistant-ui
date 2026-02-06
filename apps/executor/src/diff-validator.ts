// Validates that LLM output is a proper unified diff
export interface DiffValidationResult {
  valid: boolean;
  error?: string;
  lineCount?: number;
}

const MAX_DIFF_SIZE = parseInt(process.env.MAX_DIFF_SIZE || '5000', 10);

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

// Extract clean diff from LLM response (remove markdown, explanations, etc.)
export function extractDiff(llmResponse: string): string {
  // If response contains code blocks, try to extract diff from them
  const codeBlockRegex = /```(?:diff)?\n([\s\S]*?)```/g;
  const matches = Array.from(llmResponse.matchAll(codeBlockRegex));
  
  if (matches.length > 0) {
    // Return first code block content
    return matches[0][1].trim();
  }

  // Otherwise return as-is (will be validated)
  return llmResponse.trim();
}
