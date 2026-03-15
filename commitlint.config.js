/** @type {import('@commitlint/types').UserConfig} */
export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    // Enforce scoped commits: feat(scope): description
    "scope-empty": [1, "never"],
    // Allowed types aligned with project conventions
    "type-enum": [
      2,
      "always",
      [
        "feat", // New feature
        "fix", // Bug fix
        "docs", // Documentation
        "style", // Formatting, no code change
        "refactor", // Code restructuring
        "perf", // Performance improvement
        "test", // Adding/updating tests
        "build", // Build system or dependencies
        "ci", // CI/CD changes
        "chore", // Maintenance tasks
        "revert", // Revert a commit
      ],
    ],
    // Keep subject concise
    "subject-max-length": [2, "always", 100],
    // No period at end
    "subject-full-stop": [2, "never", "."],
    // Lowercase subject
    "subject-case": [2, "always", "lower-case"],
  },
};
