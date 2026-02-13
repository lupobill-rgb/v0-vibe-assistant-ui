import OpenAI from 'openai';
import { ProjectContext } from './context';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function generateDiff(
  prompt: string,
  context: ProjectContext,
  previousError?: string
): Promise<string> {
  const systemPrompt = `You are an expert programmer. Generate unified diffs to implement code changes.
Output ONLY a valid unified diff in this format:

diff --git a/path/to/file.ext b/path/to/file.ext
--- a/path/to/file.ext
+++ b/path/to/file.ext
@@ -start,count +start,count @@
 context line
-removed line
+added line
 context line

Rules:
1. Output ONLY the diff, no explanations, no markdown code blocks
2. If no changes are needed, output exactly "NO_CHANGES"
3. Use unified diff format (diff --git, ---, +++, @@)
4. Include context lines around changes
5. For new files, use "--- /dev/null" and "new file mode 100644"
6. For modified files, use "--- a/file" and "+++ b/file"`;

  let userPrompt = `Repository context:\n\n`;
  
  // Add file contents from context
  const files = Object.entries(context.files);
  for (const [filePath, content] of files) {
    userPrompt += `File: ${filePath}\n\`\`\`\n${content}\n\`\`\`\n\n`;
  }

  userPrompt += `\nUser request: ${prompt}\n\n`;
  userPrompt += `Generate a unified diff to implement this request.`;

  if (previousError) {
    userPrompt += `\n\nPrevious attempt failed with error:\n${previousError}\n\nPlease fix the issue and try again.`;
  }

  const response = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0,
    max_tokens: 4000
  });

  const output = response.choices[0]?.message?.content || '';
  return output.trim();
}
