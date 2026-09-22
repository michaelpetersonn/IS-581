---
name: blueprint-prompting
description: Turn software ideas into scoped, reviewable prompts and build plans for MVPs, prototypes, apps, websites, and individual features. Use for vibe-coding requests, AI coding prompts, product or feature design prompts, MVP scoping, implementation planning, or requests to build software from scratch. Apply the Blueprint Prompting sequence of context, session goal, constraints, non-goals, plan-first review, vertical slices, security, performance, and acceptance criteria.
---

# Blueprint Prompting

Treat the prompt as the design document, work ticket, and first code review. Do not begin implementation from a vague idea.

## 1. Define the MVP

Identify:

- The primary user.
- The single job the product helps that user complete.
- The main end-to-end process.
- The smallest working version of that process.

Separate possible features into must-have, nice-to-have, and explicitly out of scope. Keep the MVP centered on one complete user loop.

If a missing decision would materially change the architecture, scope, or user experience, ask a focused clarifying question. Otherwise, state a reasonable assumption.

## 2. Write the blueprint

Produce these sections before writing code:

1. **Context**: State who uses the product, the one job it performs, the chosen stack, the deployment target, and relevant existing project conventions.
2. **Goal for this session**: Name one testable vertical slice to complete now.
3. **Constraints**: Record required conventions, dependencies, integrations, file structures, and areas that must remain unchanged.
4. **Non-goals**: List features deliberately excluded from this version.
5. **Plan first**: Propose a short implementation plan. Surface assumptions, risks, and questions before changing files.
6. **Security**: Require secure defaults appropriate to the feature.
7. **Performance**: Require sensible MVP defaults and flag likely bottlenecks.
8. **Done when**: Give observable acceptance criteria.

When the user asks only for a prompt, return a ready-to-paste prompt containing all eight sections. When the user asks to build, show the blueprint and plan briefly, then implement after resolving any blocking uncertainty.

## 3. Build in vertical slices

Implement one working path end to end before adding secondary features. Prefer this order when relevant:

1. Data model and interfaces.
2. Core user flow.
3. Secondary features.

After each slice:

- Run the relevant checks.
- Inspect the result.
- Explain what changed and why.
- Correct failures before starting the next slice.

Do not queue unverified features on top of an untested foundation.

## 4. Review the generated work

Treat every generated file as an unreviewed draft. Review:

- The requested happy path.
- Empty, invalid, unauthorized, and failure states.
- Changes outside the requested scope.
- Maintainability and consistency with the existing project.
- The diff or concise file-by-file summary.

Running successfully does not by itself satisfy the acceptance criteria.

## 5. Apply security defaults

Never place credentials, tokens, passwords, or API keys in prompts or source files. Reference environment-variable names instead.

Require, where relevant:

- Parameterized database queries.
- Password hashing with a reputable adaptive algorithm.
- Server-side input validation.
- Authorization checks at the resource level.
- Least-privilege permissions.
- Safe error handling without sensitive-data exposure.
- Verification that proposed packages exist and are maintained before installation.

Ask for a plain-language explanation of authentication and authorization logic when the feature uses them.

## 6. Apply performance defaults

Optimize for a reliable first 100 users, not hypothetical massive scale. Consider:

- Pagination for growing lists.
- Indexes on commonly filtered, joined, or sorted fields.
- Caching for expensive repeated work.
- Bounded queries and payloads.
- N+1 query risks.

Avoid premature optimization. Flag work that requires specialist, low-level performance engineering rather than improvising it.

## Prompt template

Use this structure for the final ready-to-paste prompt:

```markdown
## Context
[Primary user, one job, stack, deployment target, and existing project conventions]

## Goal for this session
[One complete vertical slice]

## Constraints
- [Required convention, dependency, or integration]
- [Files or behavior that must remain unchanged]

## Non-goals
- [Explicitly excluded feature]

## Plan first
Before writing code, propose a step-by-step plan. State assumptions, identify risks, and ask only the questions whose answers would materially change the implementation.

## Security
- Keep secrets in environment variables.
- Use validated input, safe data access, and explicit authorization checks where relevant.
- Explain the authentication and permissions logic.

## Performance
- Add pagination, indexing, or caching where the slice requires them.
- Check for N+1 queries and unbounded work.

## Done when
- [Observable acceptance criterion]
- [Failure or authorization criterion]
- [Verification or test criterion]
```

## Quality check

Before delivering a prompt or implementation, confirm:

- One user and one primary job are clear.
- The session goal is one vertical slice.
- Non-goals prevent scope creep.
- The plan precedes implementation.
- Security and performance requirements are explicit and relevant.
- Acceptance criteria are observable and testable.
- Review includes unhappy paths, not only the demo path.
