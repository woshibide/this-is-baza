# GitHub Pages

The site renders `README.md` at `/` and serves the interactive gallery at `/examples/`.
README links to repository files open on GitHub.

1. In the repository's **Settings → Pages**, select **GitHub Actions** as the publishing source.
2. Push the site changes to `main`, or run **Deploy GitHub Pages** from the Actions tab after the workflow is on GitHub.
3. Open the deployment URL reported by the workflow.

The workflow tests and builds the site before publishing `dist/`.
Relative asset paths support GitHub Pages repository subdirectories and custom domains.

For a local production preview, run `npm run build` followed by `npm run preview`.
