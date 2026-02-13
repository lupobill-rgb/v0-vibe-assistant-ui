import Anthropic from '@anthropic-ai/sdk';
import { ProjectContext } from './context';

const client = new Anthropic(); // reads ANTHROPIC_API_KEY from env

const SYSTEM_PROMPT = `You are a code modification engine. 
Given a user prompt and repository context, output ONLY a valid unified diff (git diff format).
- Do NOT include any explanation, prose, or markdown code fences.
- The diff must be directly applicable via: git apply --index
- Paths in the diff must be relative to the repo root.
- If creating a new file, use /dev/null as the source path.
- If no changes are needed, output exactly: NO_CHANGES`;

export async function generateDiff(
  prompt: string,
  context: ProjectContext,
  previousError?: string
): Promise<string> {
  const contextBlock = Object.entries(context.files)
    .map(([path, content]) => `### ${path}\n\`\`\`\n${content}\n\`\`\``)
    .join('\n\n');

  const userMessage = previousError
    ? `Original prompt: ${prompt}\n\nPrevious diff failed preflight with this error:\n${previousError}\n\nPlease fix the diff.`
    : `Prompt: ${prompt}`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `${userMessage}\n\n## Repository Context\n${contextBlock}`,
      },
    ],
  });

  const text = response.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as { text: string }).text)
    .join('');

  return text.trim();
}
