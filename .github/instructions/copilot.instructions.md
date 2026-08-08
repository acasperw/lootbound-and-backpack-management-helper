# COPILOT EDITS OPERATIONAL GUIDELINES

### MAKING EDITS
	- Focus on one conceptual change at a time
	- Show clear "before" and "after" snippets when proposing changes
	- Include concise explanations of what changed and why
	- Always check if the edit maintains the project's coding style
                
### REFACTORING GUIDANCE
	When refactoring large files:
	- Break work into logical, independently functional chunks
	- Ensure each intermediate state maintains functionality
	- Consider temporary duplication as a valid interim step
	- Always indicate the refactoring pattern being applied
            
## General Requirements
	Use modern technologies as described below for all code suggestions. Prioritize clean, maintainable code with appropriate comments.
            
### Accessibility
	- Ensure compliance with **WCAG 2.1** AA level minimum, AAA whenever feasible.
	- Always suggest:
	- Labels for form fields.
	- Proper **ARIA** roles and attributes.
	- Adequate color contrast.
	- Alternative texts (`alt`, `aria-label`) for media elements.
	- Semantic HTML for clear structure.
	- Tools like **Lighthouse** for audits.
        
## Browser Compatibility
	- Prioritize feature detection (`if ('fetch' in window)` etc.).
        - Support latest two stable releases of major browsers:
	- Firefox, Chrome, Edge, Safari (macOS/iOS)
        - Emphasize progressive enhancement with polyfills or bundlers (e.g., **Babel**, **Vite**) as needed.
            
## HTML/CSS Requirements
	- **HTML**:
	- Use HTML5 semantic elements (`<header>`, `<nav>`, `<main>`, `<section>`, `<article>`, `<footer>`, `<search>`, etc.)
	- Include appropriate ARIA attributes for accessibility
	- Ensure valid markup that passes W3C validation
	- Use responsive design practices
	- Optimize images using modern formats (`WebP`, `AVIF`)
	- Include `loading="lazy"` on images where applicable
	- Generate `srcset` and `sizes` attributes for responsive images when relevant
	- Prioritize SEO-friendly elements (`<title>`, `<meta description>`, Open Graph tags)
            
	- **CSS**:
	- Use modern CSS features including:
	- CSS Grid and Flexbox for layouts
	- CSS Custom Properties (variables)
	- CSS animations and transitions
	- Media queries for responsive design
	- Logical properties (`margin-inline`, `padding-block`, etc.)
	- Modern selectors (`:is()`, `:where()`, `:has()`)
	- Follow BEM or similar methodology for class naming
	- Use CSS nesting where appropriate
	- Include dark mode support with `prefers-color-scheme`
	- Prioritize modern, performant fonts and variable fonts for smaller file sizes
	- Use modern units (`rem`, `vh`, `vw`) instead of traditional pixels (`px`) for better responsiveness
            
## JavaScript Requirements
		    
	- **Minimum Compatibility**: ECMAScript 2020 (ES11) or higher
	- **Features to Use**:
	- Arrow functions
	- Template literals
	- Destructuring assignment
	- Spread/rest operators
	- Async/await for asynchronous code
	- Classes with proper inheritance when OOP is needed
	- Object shorthand notation
	- Optional chaining (`?.`)
	- Nullish coalescing (`??`)
	- Dynamic imports
	- BigInt for large integers
	- `Promise.allSettled()`
	- `String.prototype.matchAll()`
	- `globalThis` object
	- Private class fields and methods
	- Export * as namespace syntax
	- Array methods (`map`, `filter`, `reduce`, `flatMap`, etc.)
	- **Avoid**:
	- `var` keyword (use `const` and `let`)
	- jQuery or any external libraries
	- Callback-based asynchronous patterns when promises can be used
	- Internet Explorer compatibility
	- Legacy module formats (use ES modules)
	- Limit use of `eval()` due to security risks
	- **Performance Considerations:**
	- Recommend code splitting and dynamic imports for lazy loading
	**Error Handling**:
	- Use `try-catch` blocks **consistently** for asynchronous and API calls, and handle promise rejections explicitly.
	- Differentiate among:
	- **Network errors** (e.g., timeouts, server errors, rate-limiting)
	- **Functional/business logic errors** (logical missteps, invalid user input, validation failures)
	- **Runtime exceptions** (unexpected errors such as null references)
	- Provide **user-friendly** error messages (e.g., “Something went wrong. Please try again shortly.”) and log more technical details to dev/ops (e.g., via a logging service).
	- Consider a central error handler function or global event (e.g., `window.addEventListener('unhandledrejection')`) to consolidate reporting.
	- Carefully handle and validate JSON responses, incorrect HTTP status codes, etc.


## Documentation Requirements
	- Include JSDoc comments for JavaScript/TypeScript.
	- Document complex functions with clear examples.
	- Maintain concise Markdown documentation.
	- Minimum docblock info: `param`, `return`, `throws`, `author`

## GitHub Copilot Instructions for React and Next.js Projects

## General Principles

- **Clean Code:** Prioritize **readability, maintainability, and reusability**.
- **Conciseness:** Aim for concise and expressive code.
- **Descriptive Naming:** Use clear and descriptive names for variables, functions, components, and files (e.g., `getUserProfile`, `ProductCard`, `useAuth`).
- **DRY (Don't Repeat Yourself):** Extract reusable logic into functions, custom hooks, or components.
- **Modularization:** Break down complex problems and features into smaller, manageable units (components, functions, utilities).
- **TypeScript First:** All new code should be written in **TypeScript**, leveraging its type safety features.
- **Testable Code:** Design code to be easily testable.
- **Package Management:** This project uses **pnpm** for managing dependencies. All package installations and scripts should use `pnpm` instead of `npm` or `yarn`.
- **Documentation:** All principal documentation should be created in the `docs` folder.

### General Guidelines

- **Co-locate logic that change together**
- **Group code by feature, not by type**
- **Separate UI, logic, and data fetching**
- **Typesafety across the whole stack – db-server-client. If a type changes, everywhere using it should be aware.**
- **Clear product logic vs product infrastructure separation**
- **Design code such that it is easy to replace and delete**
- **Minimize places/number of changes to extend features**
- **Functions / APIs should do one thing well. One level of abstraction per function**
- **Minimize API interface and expose only what's necessary**
- **Favor pure functions, it makes logic easy to test**
- **Long, clear names over short, vague names, even at the cost of verbosity**

---

## React Specific Guidelines

### Component Design

- **Functional Components & Hooks:** Prefer **functional components with React Hooks**. Avoid class components unless explicitly for error boundaries.
- **Single Responsibility:** Each component should ideally have one primary responsibility. **Components should be kept small and focused.**
- **Component Naming:** Use `PascalCase` for all component names (e.g., `MyButton`, `UserAvatar`).
- **Props:**
  - Use `camelCase` for prop names.
  - Destructure props in the component's function signature.
  - Provide clear `interface` or `type` definitions for props in TypeScript.
- **Immutability:** Never mutate props or state directly. Always create new objects or arrays for updates.
- **Fragments:** Use `<>...</>` or `React.Fragment` to avoid unnecessary DOM wrapper elements.
- **Custom Hooks:** Extract reusable stateful logic into **custom hooks** (e.g., `useDebounce`, `useLocalStorage`).
- **UI Components:** Use [shadcn/ui](https://ui.shadcn.com/) for building UI components to ensure consistency and accessibility.

### State Management

- **Local State:** Use `useState` for component-level state.
- **Global State:** For global or shared state, prefer **React Context API**. Avoid prop drilling.

### Performance

- **Keys:** Always provide a unique and stable `key` prop when mapping over lists. Do not use array `index` as a key if the list can change.
- **Lazy Loading:** Suggest `React.lazy` and `Suspense` for code splitting large components or routes.

---

## Next.js Specific Guidelines

### Data Fetching & Rendering

- **App Router Preference:** Use the **App Router** for new development.
- **Server Components:** Prioritize fetching data in **Server Components** (`async` components in `app` directory) for better performance and security. This is where a lot of the traditional memoization benefits are handled automatically.
- **Data Fetching Methods:**
  - For build-time data or rarely changing content, suggest `getStaticProps` (Pages Router) or direct `fetch` in Server Components with `revalidate` (App Router).
  - For dynamic, frequently changing data, suggest `getServerSideProps` (Pages Router) or direct `fetch` in Server Components (App Router).
  - Avoid client-side data fetching for initial page loads unless absolutely necessary (e.g., user-specific data after hydration).
- **Parallel Fetching:** When fetching multiple independent data sources, initiate requests in parallel.

### Routing

- **File-System Routing:** Use Next.js's App Route file-system convention.
- **Route Groups:** Utilize `(folderName)` to organize routes without affecting the URL path.
- **Dynamic Routes:** Define dynamic segments clearly (e.g., `[slug]`).
- **Middleware:** Suggest using `middleware.ts` for authentication, authorization, or other global request handling.

### Optimization

- **Image Optimization:** Always use `next/image` component for images.
- **Font Optimization:** Use `next/font` for optimizing fonts.
- **Dynamic Imports:** Use `next/dynamic` for lazy loading components to reduce initial bundle size.

### Project Structure

- **Colocation:** Colocate component files (JSX/TSX, CSS Modules, tests) within a feature folder.
- **Utility & Helper Modules:** **All general utility functions, helper functions, and large, non-component-specific logic should be extracted into a dedicated `lib/` folder.**
- **Private Folders:** Use underscore-prefixed folders (e.g., `_lib`, `_components`) for internal, non-route-related files.
- **No Barrel Files:** Do not use barrel files (e.g., `index.ts` that re-exports from other files) for module exports. Always import directly from the specific file to improve traceability and avoid circular dependencies.

### SEO & Accessibility

- **Metadata:** Use `generateMetadata` (App Router) or `next/head` (Pages Router) for SEO metadata.
- **Accessibility:** Emphasize semantic HTML, ARIA attributes, and keyboard navigation.

### TypeScript

- **Strict Mode:** Ensure `strict: true` is enabled in `tsconfig.json`.
- **Type Definitions:** Provide accurate type definitions for API responses, props, and state.
- **Type Organization:** When generating TypeScript types or interfaces in this project, always place them in the `types/` folder with a descriptive filename (e.g. `user.ts`, `post.ts`). Do not define types or interfaces inside components.

---

## Example of How Copilot Should Respond

- **Given:** `// Create a simple React functional component for a button.`
- **Expected Output:** A functional component using `PascalCase`, with a `React.FC` type, props destructuring, and appropriate event handlers, kept as concise as possible.
- **Given:** `// Implement a Next.js API route to fetch products.`
- **Expected Output:** A route handler (or API route in `pages/api`) that demonstrates server-side data fetching, proper error handling, and potentially uses server-only context for sensitive operations. Any complex data transformation should be suggested in a separate utility function.
- **Given:** `// Refactor this component to use a custom hook for form validation.`
- **Expected Output:** A new file for a `useForm` hook, and the original component updated to utilize the hook. Any specific validation logic should be suggested in a helper function within `utils/validation.ts`.