# Development Rules for This Repository

Before performing ANY task, you must first understand the project documentation.

## Documentation First

At the beginning of every new task or implementation session:

1. Read every document inside the `/docs` directory.
2. Treat these documents as the authoritative source of truth.
3. Never ignore or contradict the documented architecture, product vision, engineering standards, or UX principles.
4. If implementation conflicts with the documentation, the documentation always takes precedence unless the owner explicitly instructs otherwise.

## Required Reading Order

1. Product Manifesto (`01-product-manifesto.md`)
2. Product Vision (`02-product-vision.md`)
3. Product Requirements Document (`03-prd.md`)
4. User Journeys (`04-user-journeys.md`)
5. Functional Requirements (`05-functional-requirements.md`)
6. System Architecture (`06-system-architecture.md`)
7. Database Design (`07-database-design.md`)
8. AI Architecture (`08-ai-architecture.md`)
9. Signal Collection Engine (`09-signal-collection-engine.md`)
10. Competitor Discovery Engine (`10-competitor-discovery-engine.md`)
11. Report Generation Engine (`11-report-generation-engine.md`)
12. Notification System (`12-notification-system.md`)
13. Search Engine (`13-search-engine.md`)
14. Decision Workspace (`14-decision-workspace.md`)
15. Decision Memory (`15-decision-memory.md`)
16. UI/UX Design System (`16-ui-ux-design-system.md`)
17. Component Library (`17-component-library.md`)
18. API Specification (`18-api-specification.md`)
19. Security Architecture (`19-security-architecture.md`)
20. Coding Standards (`20-coding-standards.md`)

Do not skip documents.

## Before Writing Code

Before implementing any feature:

- Explain which documentation sections are relevant.
- Briefly summarize your implementation plan.
- Verify that the proposed implementation follows the documented architecture.
- If the implementation conflicts with any document, stop and explain the conflict instead of making assumptions.

## During Development

- Do not invent new architecture.
- Do not introduce new libraries without justification.
- Do not duplicate existing functionality.
- Reuse existing services, utilities, components, and patterns whenever possible.
- Follow the established folder structure, naming conventions, and coding standards.

## After Every Completed Task

Before marking a task as complete:

- Verify the implementation against the documentation.
- Ensure it does not violate the PRD.
- Run lint.
- Run type checking.
- Build the project if applicable.
- Fix all errors before continuing.

## Documentation Maintenance

If implementation requires a change to the product or architecture:

- Do NOT silently change the code.
- First identify which document needs updating.
- Propose the documentation update.
- Wait for approval if the change affects product behavior or architecture.
- Keep the documentation and implementation synchronized at all times.

## Long-Term Rule

This repository is documentation-driven. The `/docs` directory is the project's single source of truth. Every implementation decision must be traceable back to the documentation. Never sacrifice architectural consistency for short-term convenience.
