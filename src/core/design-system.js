const STYLE_SELECTOR = 'style[data-ppbui-design-system="1"]';
const REGISTRY_KEY = Symbol.for("ppbui.design-system.registry");
const SEQUENCE_KEY = Symbol.for("ppbui.design-system.sequence");
const revisionOf = value => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
};

export function createDesignSystemRuntime({ cssText = "", document: targetDocument } = {}) {
  let style = null;
  let mounted = false;
  let generation = null;
  const css = String(cssText);
  const revision = revisionOf(css);

  return {
    mount() {
      const doc = targetDocument || globalThis.document;
      if (!doc?.head) throw new Error("document.head is not available");
      if (mounted && style?.isConnected) return style;
      if (generation === null) {
        generation = (Number(doc[SEQUENCE_KEY]) || 0) + 1;
        doc[SEQUENCE_KEY] = generation;
      } else if ((Number(doc[SEQUENCE_KEY]) || 0) < generation) {
        doc[SEQUENCE_KEY] = generation;
      }

      let registry = doc[REGISTRY_KEY];
      if (registry && !registry.style?.isConnected) {
        delete doc[REGISTRY_KEY];
        registry = null;
      }
      if (registry) {
        if (registry.managed && generation > registry.generation) {
          registry.style.textContent = css;
          registry.style.dataset.ppbuiDesignSystemRevision = revision;
          registry.style.dataset.ppbuiDesignSystemGeneration = String(generation);
          registry.revision = revision;
          registry.generation = generation;
        }
        registry.refs++;
        style = registry.style;
        mounted = true;
        return style;
      }

      const existing = doc.head.querySelector(STYLE_SELECTOR);
      if (existing) {
        style = existing;
        const managed = existing.dataset.ppbuiDesignSystemOwner === "runtime";
        const existingGeneration = Number(existing.dataset.ppbuiDesignSystemGeneration) || 0;
        if (managed && generation > existingGeneration) {
          existing.textContent = css;
          existing.dataset.ppbuiDesignSystemRevision = revision;
          existing.dataset.ppbuiDesignSystemGeneration = String(generation);
        }
        doc[REGISTRY_KEY] = {
          style,
          managed,
          refs: 1,
          revision: existing.dataset.ppbuiDesignSystemRevision || "",
          generation: managed ? Math.max(existingGeneration, generation) : 0,
        };
        mounted = true;
        return style;
      }

      style = doc.createElement("style");
      style.dataset.ppbuiDesignSystem = "1";
      style.dataset.ppbuiDesignSystemOwner = "runtime";
      style.dataset.ppbuiDesignSystemRevision = revision;
      style.dataset.ppbuiDesignSystemGeneration = String(generation);
      style.textContent = css;
      doc.head.append(style);
      doc[REGISTRY_KEY] = { style, managed: true, refs: 1, revision, generation };
      mounted = true;
      return style;
    },

    unmount() {
      if (!mounted) return;
      const doc = targetDocument || globalThis.document;
      const registry = doc?.[REGISTRY_KEY];
      if (registry?.style === style) {
        registry.refs = Math.max(0, registry.refs - 1);
        if (registry.refs === 0) {
          if (registry.managed && registry.style?.isConnected) registry.style.remove();
          delete doc[REGISTRY_KEY];
        }
      }
      style = null;
      mounted = false;
    },

    isMounted() {
      return Boolean(mounted && style?.isConnected);
    },
  };
}
