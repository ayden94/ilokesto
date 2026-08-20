import { REGISTRY_CATEGORIES, type RegistryCategory } from "../types";

type PluginRegistration = Partial<
  Record<RegistryCategory, Record<string, any>>
>;

/**
 * 플러그인 컴포넌트를 등록하고 관리하는 싱글턴 클래스
 *
 * @example
 * ```typescript
 * import { PluginManager } from '@ilokesto/utilinent';
 * import Link from 'next/link';
 * import { motion } from 'framer-motion';
 *
 * PluginManager.register({
 *   show: {
 *     Link: Link,
 *   },
 *   base: {
 *     motionButton: motion.button,
 *   }
 * });
 *
 * declare module '@ilokesto/utilinent' {
 *   interface Register {
 *     show: {
 *       Link: typeof Link;
 *     };
 *     base: {
 *       motionButton: typeof motion.button;
 *     };
 *   }
 * }
 * ```
 */
export class PluginManager {
  private static instance: PluginManager;

  private plugins = new Map<string, Map<string, any>>();

  private constructor() {
    for (const category of REGISTRY_CATEGORIES) {
      this.plugins.set(category, new Map());
    }
  }

  private getCategory(category: string): Map<string, any> {
    const existing = this.plugins.get(category);
    if (existing) {
      return existing;
    }
    const created = new Map<string, any>();
    this.plugins.set(category, created);
    return created;
  }

  private static getInstance(): PluginManager {
    if (!PluginManager.instance) {
      PluginManager.instance = new PluginManager();
    }
    return PluginManager.instance;
  }

  /**
   * 플러그인 컴포넌트들을 객체 형태로 등록합니다
   */
  static register(plugins: PluginRegistration): void {
    const instance = PluginManager.getInstance();

    for (const [category, components] of Object.entries(plugins)) {
      if (components) {
        for (const [name, component] of Object.entries(components)) {
          instance.getCategory(category).set(name, component);
        }
      }
    }
  }

  static get<K extends RegistryCategory>(category: K, name: string): any {
    return PluginManager.getInstance().plugins.get(category)?.get(name);
  }

  static has<K extends RegistryCategory>(category: K, name: string): boolean {
    return PluginManager.getInstance().plugins.get(category)?.has(name) ?? false;
  }

  static getAll<K extends RegistryCategory>(
    category: K,
): Map<string, any> {
    return PluginManager.getInstance().getCategory(category);
  }

  static unregister<K extends RegistryCategory>(
    category: K,
    name: string,
  ): boolean {
    return PluginManager.getInstance().plugins.get(category)?.delete(name) ?? false;
  }
}