import { describe, it } from 'node:test';
import assert from 'node:assert';
import { validateUnifiedDiff, extractDiff, validateDiffApplicability } from './diff-validator';
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
    assert.ok(result.error?.includes('file markers'));
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
