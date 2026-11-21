# Features

One folder per document feature, for example `markdown`. A feature owns its parsing, editing, rendering, save strategy, undo history, and feature-specific components.

```
features/<name>/
  index.ts        public API: the only entry other code imports
  components/     feature-specific components
  hooks/
  lib/
```

Import a feature only through `@/features/<name>`. Inside a feature, use relative imports. Shared components never import features.
