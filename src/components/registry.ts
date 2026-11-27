/**
 * Builds a component registry from a webpack `require.context` over one folder.
 * Every `<Name>.tsx` that exports a component called `<Name>` is registered under `Name`,
 * so adding a character or environment never edits a tracked file.
 * Lower-case helper files (`rig.tsx`, `layer.tsx`) are excluded by the context filter.
 * `require.context` must be called literally in each registry file so the bundler can see it.
 */
export type ComponentContext = { keys(): string[]; (id: string): Record<string, unknown> };

declare global {
  namespace NodeJS {
    interface Require {
      /** Provided by Remotion's webpack bundler. */
      context(directory: string, useSubdirectories: boolean, regExp: RegExp): ComponentContext;
    }
  }
}

export const collect = <T>(files: ComponentContext): Record<string, T> => {
  const registry: Record<string, T> = {};
  for (const key of files.keys()) {
    const name = key.replace(/^\.\//, "").replace(/\.tsx$/, "");
    const component = files(key)[name];
    if (typeof component === "function") registry[name] = component as T;
  }
  return registry;
};
