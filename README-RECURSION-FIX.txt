RECURSION FIX

Replace package.json with the file in this zip.

Then in Cloudflare Workers Builds settings use:
- Build command: npx @opennextjs/cloudflare build
- Deploy command: npx @opennextjs/cloudflare deploy

Important:
- Delete package-lock.json in your project before the next push
- Let Cloudflare regenerate dependencies on build

Why this fixes it:
The package.json build script must stay as `next build`.
OpenNext's build command calls the package.json build script first.
If the build script is `opennextjs-cloudflare build`, it loops recursively.
