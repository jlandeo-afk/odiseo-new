# Research: Gestión de Sílabos

No critical unknowns were left after the rigorous clarification phase.

## Technical Choices
- **Optimistic UI with Rollback**: Handled via Vue/Pinia store updates prior to API calls, reverting on catch.
- **Cross-Route Toasts**: Global toast notification service decoupled from the syllabus component so it persists across Vue Router navigations.
- **Data-Density Matrix**: Use CSS Grid for the week × topic matrix to ensure compactness and readability.
