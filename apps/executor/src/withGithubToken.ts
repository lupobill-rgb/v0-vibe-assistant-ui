/**
 * Injects a GitHub token into a repository URL using x-access-token format.
 * 
 * @param repoUrl - GitHub repository URL in various formats
 * @param token - Optional GitHub access token
 * @returns Normalized HTTPS URL with token, or original URL if token is missing
 */
export function withGithubToken(repoUrl: string, token?: string): string {
  // If token is missing or empty, return unchanged
  if (!token || token.trim() === '') {
    return repoUrl;
  }

  // Parse the repository URL to extract owner and repo
  let owner: string;
  let repo: string;

  // Handle HTTPS format: https://github.com/OWNER/REPO or https://github.com/OWNER/REPO.git
  const httpsMatch = repoUrl.match(/^https:\/\/github\.com\/([^\/]+)\/([^\/]+?)(\.git)?$/);
  if (httpsMatch) {
    owner = httpsMatch[1];
    repo = httpsMatch[2];
  } else {
    // Handle SSH format: git@github.com:OWNER/REPO.git
    const sshMatch = repoUrl.match(/^git@github\.com:([^\/]+)\/([^\/]+?)(\.git)?$/);
    if (sshMatch) {
      owner = sshMatch[1];
      repo = sshMatch[2];
    } else {
      // If format is unrecognized, return unchanged
      return repoUrl;
    }
  }

  // Remove .git suffix if present in repo name
  repo = repo.replace(/\.git$/, '');

  // Validate that owner and repo are non-empty after processing
  if (!owner || !repo) {
    return repoUrl;
  }

  // Return HTTPS URL with x-access-token format
  return `https://x-access-token:${token}@github.com/${owner}/${repo}.git`;
}
