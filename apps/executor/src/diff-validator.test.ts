import { describe, it } from 'node:test';
import assert from 'node:assert';
import { validateUnifiedDiff, extractDiff, validateDiffApplicability, sanitizeUnifiedDiff, validateUnifiedDiffEnhanced } from './diff-validator';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';

/**
 * DiffValidator Test Suite
 * 
 * Proves that the DiffValidator hard-rejects non-diff output from LLM
 * and enforces all size limits and format requirements.
 */

describe('DiffValidator - Non-Diff Rejection', () => {
  it('should reject plain code without diff markers', () => {
    const plainCode = `
function hello() {
  console.log("Hello World");
}

export default hello;
`;
    
    const result = validateUnifiedDiff(plainCode);
    assert.strictEqual(result.valid, false);
    assert.ok(result.error?.includes('Missing unified diff header'));
  });

  it('should reject markdown code blocks', () => {
    const markdown = `
Here's the change you need:

\`\`\`javascript
function hello() {
  console.log("Hello World");
}
\`\`\`

This adds a hello function.
`;
    
    const result = validateUnifiedDiff(markdown);
    assert.strictEqual(result.valid, false);
    assert.ok(result.error?.includes('code blocks') || result.error?.includes('Missing unified diff header'));
  });

  it('should reject explanatory text without diff', () => {
    const explanation = `
I've updated the login function to add validation.
The changes include:
- Email format validation
- Password length check
- Error messages for invalid input
`;
    
    const result = validateUnifiedDiff(explanation);
    assert.strictEqual(result.valid, false);
    assert.ok(result.error);
  });

  it('should reject incomplete diff (missing file markers)', () => {
    const incompleteDiff = `
diff --git a/src/login.js b/src/login.js
@@ -1,3 +1,4 @@
 function login(email, password) {
+  if (!email) return false;
   return true;
 }
`;
    
    const result = validateUnifiedDiff(incompleteDiff);
    assert.strictEqual(result.valid, false);
    assert.ok(result.error?.includes('missing --- header') || result.error?.includes('missing +++ header'));
  });

  it('should reject incomplete diff (missing hunk markers)', () => {
    const incompleteDiff = `
diff --git a/src/login.js b/src/login.js
--- a/src/login.js
+++ b/src/login.js
 function login(email, password) {
+  if (!email) return false;
   return true;
 }
`;
    
    const result = validateUnifiedDiff(incompleteDiff);
    assert.strictEqual(result.valid, false);
    assert.ok(result.error?.includes('hunk markers'));
  });

  it('should reject diff with embedded code blocks', () => {
    const mixedContent = `
diff --git a/src/login.js b/src/login.js
--- a/src/login.js
+++ b/src/login.js
@@ -1,3 +1,4 @@
 function login(email, password) {
+  if (!email) return false;
   return true;
 }

\`\`\`
Note: This adds validation
\`\`\`
`;
    
    const result = validateUnifiedDiff(mixedContent);
    assert.strictEqual(result.valid, false);
    assert.ok(result.error?.includes('code blocks'));
  });
});

describe('DiffValidator - Size Limits', () => {
  it('should reject diff exceeding MAX_DIFF_SIZE', () => {
    // Create a diff with more than 5000 lines
    const maxSize = parseInt(process.env.MAX_DIFF_SIZE || '5000', 10);
    const lines = ['diff --git a/test.js b/test.js', '--- a/test.js', '+++ b/test.js', '@@ -1,1 +1,1 @@'];
    
    // Add enough lines to exceed limit
    for (let i = 0; i < maxSize + 100; i++) {
      lines.push(`+line ${i}`);
    }
    
    const hugeDiff = lines.join('\n');
    const result = validateUnifiedDiff(hugeDiff);
    
    assert.strictEqual(result.valid, false);
    assert.ok(result.error?.includes('exceeds maximum size'));
    assert.ok(result.lineCount! > maxSize);
  });

  it('should reject diff that is too short', () => {
    const tinyDiff = 'a\nb';
    const result = validateUnifiedDiff(tinyDiff);
    
    assert.strictEqual(result.valid, false);
    assert.ok(result.error?.includes('too short'));
  });
});

describe('DiffValidator - Valid Diffs', () => {
  it('should accept properly formatted unified diff', () => {
    const validDiff = `
diff --git a/src/login.js b/src/login.js
--- a/src/login.js
+++ b/src/login.js
@@ -1,5 +1,8 @@
 function login(email, password) {
+  if (!email || !email.includes('@')) {
+    return false;
+  }
   return authenticate(email, password);
 }
`;
    
    const result = validateUnifiedDiff(validDiff);
    assert.strictEqual(result.valid, true);
    assert.ok(!result.error);
    assert.ok(result.lineCount! > 0);
  });

  it('should accept diff with multiple files', () => {
    const multiFileDiff = `
diff --git a/src/login.js b/src/login.js
--- a/src/login.js
+++ b/src/login.js
@@ -1,3 +1,4 @@
 function login(email, password) {
+  validate(email);
   return authenticate(email, password);
 }
diff --git a/src/validate.js b/src/validate.js
--- a/src/validate.js
+++ b/src/validate.js
@@ -0,0 +1,5 @@
+function validate(email) {
+  if (!email.includes('@')) throw new Error('Invalid email');
+}
+
+export { validate };
`;
    
    const result = validateUnifiedDiff(multiFileDiff);
    assert.strictEqual(result.valid, true);
  });
});

describe('DiffValidator - Extract Diff', () => {
  it('should extract diff from markdown code block', () => {
    const llmResponse = `
Here's the change:

\`\`\`diff
diff --git a/src/login.js b/src/login.js
--- a/src/login.js
+++ b/src/login.js
@@ -1,3 +1,4 @@
 function login(email, password) {
+  validate(email);
   return authenticate(email, password);
 }
\`\`\`

This adds validation.
`;
    
    const extracted = extractDiff(llmResponse);
    assert.ok(extracted.includes('diff --git'));
    assert.ok(extracted.includes('validate(email)'));
    assert.ok(!extracted.includes('```'));
    assert.ok(!extracted.includes('Here\'s the change'));
  });

  it('should return content as-is if no code blocks', () => {
    const pureResponse = `diff --git a/src/login.js b/src/login.js
--- a/src/login.js
+++ b/src/login.js
@@ -1,3 +1,4 @@
 function login() {
+  return true;
 }`;
    
    const extracted = extractDiff(pureResponse);
    assert.strictEqual(extracted.trim(), pureResponse.trim());
  });

  it('should ensure extracted diff ends with exactly one newline', () => {
    // Test case 1: diff without trailing newline in code block
    const responseNoNewline = `\`\`\`diff
diff --git a/test.js b/test.js
--- a/test.js
+++ b/test.js
@@ -1,2 +1,3 @@
 line1
+line2
 line3\`\`\``;
    
    const extracted1 = extractDiff(responseNoNewline);
    assert.ok(extracted1.endsWith('\n'), 'Diff should end with newline');
    assert.ok(!extracted1.endsWith('\n\n'), 'Diff should not end with multiple newlines');
    
    // Test case 2: diff with trailing newline
    const responseWithNewline = `\`\`\`diff
diff --git a/test.js b/test.js
--- a/test.js
+++ b/test.js
@@ -1,2 +1,3 @@
 line1
+line2
 line3
\`\`\``;
    
    const extracted2 = extractDiff(responseWithNewline);
    assert.ok(extracted2.endsWith('\n'), 'Diff should end with newline');
    assert.ok(!extracted2.endsWith('\n\n'), 'Diff should not end with multiple newlines');
    
    // Test case 3: plain response without trailing newline
    const plainNoNewline = `diff --git a/test.js b/test.js
--- a/test.js
+++ b/test.js
@@ -1,2 +1,3 @@
 line1
+line2
 line3`;
    
    const extracted3 = extractDiff(plainNoNewline);
    assert.ok(extracted3.endsWith('\n'), 'Plain diff should end with newline');
    assert.ok(!extracted3.endsWith('\n\n'), 'Plain diff should not end with multiple newlines');
  });
});

describe('DiffValidator - Git Apply Check', () => {
  it('should validate that a correct diff can be applied', () => {
    // Create a temporary git repo with a file
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-test-'));
    
    try {
      // Initialize git repo
      execSync('git init', { cwd: tempDir });
      execSync('git config user.email "test@test.com"', { cwd: tempDir });
      execSync('git config user.name "Test"', { cwd: tempDir });
      
      // Create a test file
      const testFile = path.join(tempDir, 'test.js');
      fs.writeFileSync(testFile, 'function hello() {\n  console.log("hi");\n}\n');
      execSync('git add test.js', { cwd: tempDir });
      execSync('git commit -m "Initial commit"', { cwd: tempDir });
      
      // Create a valid diff for this file
      const validDiff = `diff --git a/test.js b/test.js
--- a/test.js
+++ b/test.js
@@ -1,3 +1,4 @@
 function hello() {
+  console.log("world");
   console.log("hi");
 }
`;
      
      const result = validateDiffApplicability(validDiff, tempDir);
      assert.strictEqual(result.valid, true);
      assert.ok(!result.error);
      
    } finally {
      // Clean up
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should reject diff that cannot be applied', () => {
    // Create a temporary git repo
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-test-'));
    
    try {
      // Initialize git repo
      execSync('git init', { cwd: tempDir });
      execSync('git config user.email "test@test.com"', { cwd: tempDir });
      execSync('git config user.name "Test"', { cwd: tempDir });
      
      // Create a test file
      const testFile = path.join(tempDir, 'test.js');
      fs.writeFileSync(testFile, 'function hello() {\n  return true;\n}\n');
      execSync('git add test.js', { cwd: tempDir });
      execSync('git commit -m "Initial commit"', { cwd: tempDir });
      
      // Create a diff that doesn't match the file content
      const invalidDiff = `diff --git a/test.js b/test.js
--- a/test.js
+++ b/test.js
@@ -1,3 +1,4 @@
 function goodbye() {
+  console.log("bye");
   return false;
 }
`;
      
      const result = validateDiffApplicability(invalidDiff, tempDir);
      assert.strictEqual(result.valid, false);
      assert.ok(result.error);
      assert.ok(result.error.includes('cannot be applied'));
      
    } finally {
      // Clean up
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should handle diff with CRLF line endings (Windows)', () => {
    // Create a temporary git repo with a file
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-test-'));
    
    try {
      // Initialize git repo
      execSync('git init', { cwd: tempDir });
      execSync('git config user.email "test@test.com"', { cwd: tempDir });
      execSync('git config user.name "Test"', { cwd: tempDir });
      
      // Create a test file
      const testFile = path.join(tempDir, 'test.js');
      fs.writeFileSync(testFile, 'function hello() {\n  console.log("hi");\n}\n');
      execSync('git add test.js', { cwd: tempDir });
      execSync('git commit -m "Initial commit"', { cwd: tempDir });
      
      // Create a valid diff but with CRLF line endings (simulating Windows)
      const validDiffWithCRLF = `diff --git a/test.js b/test.js\r
--- a/test.js\r
+++ b/test.js\r
@@ -1,3 +1,4 @@\r
 function hello() {\r
+  console.log("world");\r
   console.log("hi");\r
 }\r
`;
      
      // This should succeed because our fix normalizes CRLF to LF
      const result = validateDiffApplicability(validDiffWithCRLF, tempDir);
      assert.strictEqual(result.valid, true);
      assert.ok(!result.error);
      
    } finally {
      // Clean up
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});

describe('DiffValidator - Invalid Diff Line Format', () => {
  it('should reject diff with invalid line prefixes in hunk', () => {
    const invalidDiff = `diff --git a/test.js b/test.js
--- a/test.js
+++ b/test.js
@@ -1,3 +1,3 @@
 function hello() {
>  this line has wrong prefix
   return true;
 }
`;
    
    const result = validateUnifiedDiff(invalidDiff);
    assert.strictEqual(result.valid, false);
    assert.ok(result.error?.includes('Invalid diff line'));
  });

  it('should accept backslash for "No newline" marker', () => {
    const diffWithNoNewline = `diff --git a/test.js b/test.js
--- a/test.js
+++ b/test.js
@@ -1,3 +1,3 @@
 function hello() {
   return true;
 }
\\ No newline at end of file
`;
    
    const result = validateUnifiedDiff(diffWithNoNewline);
    assert.strictEqual(result.valid, true);
  });
});

describe('sanitizeUnifiedDiff', () => {
  it('should extract diff when it starts with diff --git', () => {
    const input = `diff --git a/test.js b/test.js
--- a/test.js
+++ b/test.js
@@ -1,2 +1,3 @@
 line1
+line2
 line3`;
    
    const result = sanitizeUnifiedDiff(input);
    assert.ok(result !== null);
    assert.ok(result.startsWith('diff --git'));
  });

  it('should return null when diff --git is missing', () => {
    const input = `This is just some text
without any diff markers
at all`;
    
    const result = sanitizeUnifiedDiff(input);
    assert.strictEqual(result, null);
  });

  it('should extract diff from middle of text', () => {
    const input = `Here is some explanation text
that comes before the diff.

diff --git a/test.js b/test.js
--- a/test.js
+++ b/test.js
@@ -1,2 +1,3 @@
 line1
+line2
 line3`;
    
    const result = sanitizeUnifiedDiff(input);
    assert.ok(result !== null);
    assert.ok(result.startsWith('diff --git'));
    assert.ok(!result.includes('Here is some explanation'));
  });

  it('should remove trailing markdown code fences', () => {
    const input = `Some text before
diff --git a/test.js b/test.js
--- a/test.js
+++ b/test.js
@@ -1,2 +1,3 @@
 line1
+line2
 line3
\`\`\``;
    
    const result = sanitizeUnifiedDiff(input);
    assert.ok(result !== null);
    assert.ok(!result.includes('```'));
    assert.ok(result.endsWith('line3'));
  });

  it('should trim whitespace', () => {
    const input = `  
    diff --git a/test.js b/test.js
--- a/test.js
+++ b/test.js
@@ -1,2 +1,3 @@
 line1
+line2
 line3
    `;
    
    const result = sanitizeUnifiedDiff(input);
    assert.ok(result !== null);
    assert.ok(result.startsWith('diff --git'));
    assert.ok(!result.startsWith(' '));
  });

  it('should handle markdown code fence with diff label', () => {
    const input = `\`\`\`diff
diff --git a/test.js b/test.js
--- a/test.js
+++ b/test.js
@@ -1,2 +1,3 @@
 line1
+line2
 line3
\`\`\``;
    
    const result = sanitizeUnifiedDiff(input);
    assert.ok(result !== null);
    assert.ok(!result.includes('```'));
    assert.ok(result.startsWith('diff --git'));
  });

  it('should reject diff with commentary starting with "Here\'s"', () => {
    const input = `diff --git a/test.js b/test.js
--- a/test.js
+++ b/test.js
@@ -1,2 +1,3 @@
 line1
+line2
 line3
Here's the explanation for the change.`;
    
    const result = sanitizeUnifiedDiff(input);
    assert.strictEqual(result, null);
  });

  it('should reject diff with commentary starting with "Sure"', () => {
    const input = `Sure, I can help with that.
diff --git a/test.js b/test.js
--- a/test.js
+++ b/test.js
@@ -1,2 +1,3 @@
 line1
+line2
 line3`;
    
    const result = sanitizeUnifiedDiff(input);
    assert.strictEqual(result, null);
  });

  it('should reject diff with commentary starting with "I\'ll"', () => {
    const input = `diff --git a/test.js b/test.js
--- a/test.js
+++ b/test.js
@@ -1,2 +1,3 @@
 line1
+line2
 line3
I'll add some more context here.`;
    
    const result = sanitizeUnifiedDiff(input);
    assert.strictEqual(result, null);
  });

  it('should reject diff with markdown fence still present', () => {
    const input = `diff --git a/test.js b/test.js
--- a/test.js
+++ b/test.js
\`\`\`
@@ -1,2 +1,3 @@
 line1
+line2
 line3`;
    
    const result = sanitizeUnifiedDiff(input);
    assert.strictEqual(result, null);
  });
});

describe('validateUnifiedDiffEnhanced', () => {
  it('should return ok: true for valid diff', () => {
    const validDiff = `diff --git a/test.js b/test.js
--- a/test.js
+++ b/test.js
@@ -1,2 +1,3 @@
 line1
+line2
 line3`;
    
    const result = validateUnifiedDiffEnhanced(validDiff);
    assert.strictEqual(result.ok, true);
    assert.strictEqual(result.errors.length, 0);
  });

  it('should detect missing --- header', () => {
    const invalidDiff = `diff --git a/test.js b/test.js
+++ b/test.js
@@ -1,2 +1,3 @@
 line1
+line2
 line3`;
    
    const result = validateUnifiedDiffEnhanced(invalidDiff);
    assert.strictEqual(result.ok, false);
    assert.ok(result.errors.some(e => e.includes('missing --- header')));
  });

  it('should detect missing +++ header', () => {
    const invalidDiff = `diff --git a/test.js b/test.js
--- a/test.js
@@ -1,2 +1,3 @@
 line1
+line2
 line3`;
    
    const result = validateUnifiedDiffEnhanced(invalidDiff);
    assert.strictEqual(result.ok, false);
    assert.ok(result.errors.some(e => e.includes('missing +++ header')));
  });

  it('should detect missing both headers', () => {
    const invalidDiff = `diff --git a/test.js b/test.js
@@ -1,2 +1,3 @@
 line1
+line2
 line3`;
    
    const result = validateUnifiedDiffEnhanced(invalidDiff);
    assert.strictEqual(result.ok, false);
    assert.ok(result.errors.some(e => e.includes('missing --- header')));
    assert.ok(result.errors.some(e => e.includes('missing +++ header')));
  });

  it('should validate multiple file blocks', () => {
    const multiFileDiff = `diff --git a/file1.js b/file1.js
--- a/file1.js
+++ b/file1.js
@@ -1,2 +1,3 @@
 line1
+line2
 line3
diff --git a/file2.js b/file2.js
--- a/file2.js
+++ b/file2.js
@@ -1,2 +1,3 @@
 lineA
+lineB
 lineC`;
    
    const result = validateUnifiedDiffEnhanced(multiFileDiff);
    assert.strictEqual(result.ok, true);
    assert.strictEqual(result.errors.length, 0);
  });

  it('should detect missing headers in second file block', () => {
    const multiFileDiff = `diff --git a/file1.js b/file1.js
--- a/file1.js
+++ b/file1.js
@@ -1,2 +1,3 @@
 line1
+line2
 line3
diff --git a/file2.js b/file2.js
@@ -1,2 +1,3 @@
 lineA
+lineB
 lineC`;
    
    const result = validateUnifiedDiffEnhanced(multiFileDiff);
    assert.strictEqual(result.ok, false);
    assert.ok(result.errors.some(e => e.includes('file2.js') && e.includes('missing --- header')));
    assert.ok(result.errors.some(e => e.includes('file2.js') && e.includes('missing +++ header')));
  });

  it('should reject content before first diff --git', () => {
    const invalidDiff = `Some text before the diff
diff --git a/test.js b/test.js
--- a/test.js
+++ b/test.js
@@ -1,2 +1,3 @@
 line1
+line2
 line3`;
    
    const result = validateUnifiedDiffEnhanced(invalidDiff);
    assert.strictEqual(result.ok, false);
    assert.ok(result.errors.some(e => e.includes('content before the first diff --git')));
  });

  it('should reject diff with no file blocks', () => {
    const invalidDiff = `Just some random text
without any proper diff structure
but enough lines to not be
rejected as too short`;
    
    const result = validateUnifiedDiffEnhanced(invalidDiff);
    assert.strictEqual(result.ok, false);
    assert.ok(result.errors.length > 0);
    assert.ok(result.errors.some(e => e.includes('Missing unified diff header') || e.includes('no file blocks')));
  });

  it('should allow /dev/null headers for new/deleted files', () => {
    const newFileDiff = `diff --git a/newfile.js b/newfile.js
--- /dev/null
+++ b/newfile.js
@@ -0,0 +1,3 @@
+line1
+line2
+line3`;
    
    const result = validateUnifiedDiffEnhanced(newFileDiff);
    assert.strictEqual(result.ok, true);
    assert.strictEqual(result.errors.length, 0);
  });
});

describe('Integration: sanitizeUnifiedDiff -> extractDiff -> validateUnifiedDiffEnhanced', () => {
  it('should handle LLM output with code fences (no commentary)', () => {
    const llmOutput = `\`\`\`diff
diff --git a/src/utils.js b/src/utils.js
--- a/src/utils.js
+++ b/src/utils.js
@@ -1,5 +1,7 @@
 export function process(data) {
+  if (!data) {
+    return null;
+  }
   return data.trim();
 }
\`\`\``;

    // Step 1: Sanitize
    const sanitized = sanitizeUnifiedDiff(llmOutput);
    assert.ok(sanitized !== null, 'Should successfully sanitize LLM output');
    assert.ok(!sanitized.includes('```'), 'Should remove code fences');

    // Step 2: Extract
    const diff = extractDiff(sanitized);
    assert.ok(diff.includes('diff --git'), 'Should contain diff header');

    // Step 3: Validate
    const validation = validateUnifiedDiffEnhanced(diff);
    assert.strictEqual(validation.ok, true, 'Should pass validation');
    assert.strictEqual(validation.errors.length, 0, 'Should have no errors');
  });

  it('should reject LLM output with commentary before diff', () => {
    const llmOutput = `I'll help you with that change. Here's the diff:

\`\`\`diff
diff --git a/src/utils.js b/src/utils.js
--- a/src/utils.js
+++ b/src/utils.js
@@ -1,5 +1,7 @@
 export function process(data) {
+  if (!data) {
+    return null;
+  }
   return data.trim();
 }
\`\`\`

This adds a null check to the process function.`;

    // Step 1: Sanitize - should reject due to commentary
    const sanitized = sanitizeUnifiedDiff(llmOutput);
    assert.strictEqual(sanitized, null, 'Should reject output with commentary');
  });

  it('should reject LLM output with missing diff header', () => {
    const llmOutput = `Here's the code you need:

function hello() {
  console.log("world");
}

Just add this to your file.`;

    // Step 1: Sanitize
    const sanitized = sanitizeUnifiedDiff(llmOutput);
    assert.strictEqual(sanitized, null, 'Should return null for missing diff header');
  });

  it('should reject LLM output with invalid diff structure', () => {
    const llmOutput = `diff --git a/test.js b/test.js
@@ -1,2 +1,3 @@
 line1
+line2
 line3`;

    // Step 1: Sanitize
    const sanitized = sanitizeUnifiedDiff(llmOutput);
    assert.ok(sanitized !== null, 'Should sanitize successfully');

    // Step 2: Extract
    const diff = extractDiff(sanitized);

    // Step 3: Validate
    const validation = validateUnifiedDiffEnhanced(diff);
    assert.strictEqual(validation.ok, false, 'Should fail validation');
    assert.ok(validation.errors.some(e => e.includes('missing --- header')));
    assert.ok(validation.errors.some(e => e.includes('missing +++ header')));
  });

  it('should handle multiple file blocks correctly', () => {
    const llmOutput = `Here are the changes:

diff --git a/file1.js b/file1.js
--- a/file1.js
+++ b/file1.js
@@ -1,2 +1,3 @@
 line1
+line2
 line3
diff --git a/file2.js b/file2.js
--- a/file2.js
+++ b/file2.js
@@ -1,2 +1,3 @@
 lineA
+lineB
 lineC`;

    const sanitized = sanitizeUnifiedDiff(llmOutput);
    assert.ok(sanitized !== null);
    
    const diff = extractDiff(sanitized);
    const validation = validateUnifiedDiffEnhanced(diff);
    
    assert.strictEqual(validation.ok, true);
    assert.strictEqual(validation.errors.length, 0);
  });
});

describe('Git Worktree Integration', () => {
  it('should successfully apply patch using worktree preflight', () => {
    // Create a temporary git repo for testing
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-worktree-test-'));
    
    try {
      // Initialize git repo
      execSync('git init', { cwd: tempDir });
      execSync('git config user.email "test@test.com"', { cwd: tempDir });
      execSync('git config user.name "Test"', { cwd: tempDir });
      
      // Create a test file
      const testFile = path.join(tempDir, 'test.js');
      fs.writeFileSync(testFile, 'function hello() {\n  console.log("hi");\n}\n');
      execSync('git add test.js', { cwd: tempDir });
      execSync('git commit -m "Initial commit"', { cwd: tempDir });
      
      // Create a valid diff for this file
      const validDiff = `diff --git a/test.js b/test.js
--- a/test.js
+++ b/test.js
@@ -1,3 +1,4 @@
 function hello() {
+  console.log("world");
   console.log("hi");
 }
`;
      
      // Create a temporary worktree
      const worktreeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-worktree-'));
      
      try {
        // Add worktree
        execSync(`git worktree add --detach "${worktreeDir}" HEAD`, { cwd: tempDir });
        
        // Write patch to worktree
        const patchPath = path.join(worktreeDir, 'patch.diff');
        fs.writeFileSync(patchPath, validDiff);
        
        // Test git apply --check in worktree
        execSync('git apply --check patch.diff', { cwd: worktreeDir });
        
        // If we got here, preflight passed - now apply to main repo
        const mainPatchPath = path.join(tempDir, 'patch.diff');
        fs.writeFileSync(mainPatchPath, validDiff);
        execSync('git apply patch.diff', { cwd: tempDir });
        
        // Verify the patch was applied
        const content = fs.readFileSync(testFile, 'utf-8');
        assert.ok(content.includes('console.log("world")'));
        
        // Clean up worktree
        execSync(`git worktree remove --force "${worktreeDir}"`, { cwd: tempDir });
        
      } finally {
        // Clean up worktree directory if it still exists
        if (fs.existsSync(worktreeDir)) {
          fs.rmSync(worktreeDir, { recursive: true, force: true });
        }
      }
      
    } finally {
      // Clean up test repo
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should detect invalid patch in worktree before applying to main repo', () => {
    // Create a temporary git repo for testing
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-worktree-test-'));
    
    try {
      // Initialize git repo
      execSync('git init', { cwd: tempDir });
      execSync('git config user.email "test@test.com"', { cwd: tempDir });
      execSync('git config user.name "Test"', { cwd: tempDir });
      
      // Create a test file
      const testFile = path.join(tempDir, 'test.js');
      fs.writeFileSync(testFile, 'function hello() {\n  return true;\n}\n');
      execSync('git add test.js', { cwd: tempDir });
      execSync('git commit -m "Initial commit"', { cwd: tempDir });
      
      // Create an invalid diff (doesn't match the file content)
      const invalidDiff = `diff --git a/test.js b/test.js
--- a/test.js
+++ b/test.js
@@ -1,3 +1,4 @@
 function goodbye() {
+  console.log("bye");
   return false;
 }
`;
      
      // Create a temporary worktree
      const worktreeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-worktree-'));
      
      try {
        // Add worktree
        execSync(`git worktree add --detach "${worktreeDir}" HEAD`, { cwd: tempDir });
        
        // Write patch to worktree
        const patchPath = path.join(worktreeDir, 'patch.diff');
        fs.writeFileSync(patchPath, invalidDiff);
        
        // Test git apply --check in worktree - should fail
        let checkFailed = false;
        try {
          execSync('git apply --check patch.diff', { cwd: worktreeDir, stdio: 'pipe' });
        } catch (error) {
          checkFailed = true;
        }
        
        assert.strictEqual(checkFailed, true, 'git apply --check should fail for invalid diff');
        
        // Clean up worktree
        execSync(`git worktree remove --force "${worktreeDir}"`, { cwd: tempDir });
        
      } finally {
        // Clean up worktree directory if it still exists
        if (fs.existsSync(worktreeDir)) {
          fs.rmSync(worktreeDir, { recursive: true, force: true });
        }
      }
      
    } finally {
      // Clean up test repo
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
