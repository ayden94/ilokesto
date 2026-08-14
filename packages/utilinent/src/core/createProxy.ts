import { htmlTags } from "../constants/htmlTags";
import type { RegistryCategory } from "../types";
import { PluginManager } from "./PluginManager";

export function createProxy<TProxy extends object, TBase extends object = TProxy>(
  base: TBase,
  renderForTag: (tag: any) => React.ForwardRefExoticComponent<any>,
  category: RegistryCategory
): TProxy {
  const tagEntries = Object.keys(htmlTags).reduce((acc, tag) => {
    (acc as any)[tag] = renderForTag(tag);
    return acc;
  }, {} as Record<string, any>);

  const target = Object.assign(base, tagEntries) as TBase & Record<string, any>;

  return new Proxy(target, {
    get(currentTarget, prop) {
      if (prop in currentTarget) {
        return (currentTarget as any)[prop];
      }

      const propName = String(prop);

      if (PluginManager.has(category, propName)) {
        const component = PluginManager.get(category, propName);
        const specialized = renderForTag(component);
        (currentTarget as any)[prop] = specialized;
        return specialized;
      }

      if (PluginManager.has("base", propName)) {
        const component = PluginManager.get("base", propName);
        const specialized = renderForTag(component);
        (currentTarget as any)[prop] = specialized;
        return specialized;
      }

      return undefined;
    },
  }) as TProxy;
}
