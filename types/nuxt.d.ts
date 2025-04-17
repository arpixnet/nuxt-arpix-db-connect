import type { ModuleOptions as DbConnectModuleOptions } from '../src/module'

// Augment the NuxtConfig interface to include our module's options
declare module 'nuxt/schema' {
  interface NuxtConfig {
    dbConnect?: DbConnectModuleOptions
  }
  interface PublicRuntimeConfig {
    dbConnect?: DbConnectModuleOptions
  }
}

// Declare the module '@nuxt/kit' for module development
declare module '@nuxt/kit' {
  export interface ModuleOptions {
    [key: string]: any;
  }

  export interface Nuxt {
    options: NuxtOptions;
    [key: string]: any;
  }

  export interface NuxtOptions {
    runtimeConfig: {
      public: Record<string, any>;
      [key: string]: any;
    };
    [key: string]: any;
  }

  export interface Resolver {
    resolve(path: string): string;
    [key: string]: any;
  }

  export function defineNuxtModule<T extends ModuleOptions>(options: {
    meta?: {
      name?: string;
      configKey?: string;
      [key: string]: any;
    };
    defaults?: Partial<T>;
    setup(options: T, nuxt: Nuxt): void | Promise<void>;
  }): any;

  export function addPlugin(plugin: string | { src: string; mode?: 'client' | 'server' }): void;
  export function createResolver(url: string): Resolver;
}

// Declare defineNuxtConfig if needed (often auto-imported in Nuxt 3)
// declare module 'nuxt/config' {
//   function defineNuxtConfig(config: import('nuxt/schema').NuxtConfig): typeof config;
// }

// Ensure this file is treated as a module.
export {}
