import { FrameworkConfiguration, Aurelia, Controller, PLATFORM, Container, TemplatingEngine } from "aurelia-framework";
import { getLogger } from "aurelia-logging";

const logger = getLogger("enhance-watch")

declare module "aurelia-framework" {
  interface Aurelia {
    enhanceAndWatch(bindingContext?: unknown, applicationHost?: string | Element): Promise<Aurelia>
    stopWatch(): void
  }
}

export function configure(config: FrameworkConfiguration) {
  const mutationEnhancer = new MutationEnhancer(config.aurelia)

  config.aurelia.enhanceAndWatch = async function (bindingContext?: unknown, applicationHost?: string | Element) {
    mutationEnhancer.watch(bindingContext, applicationHost)
    logger.info("calling .enhance()")
    return this.enhance(bindingContext, applicationHost)
  }

  config.aurelia.stopWatch = async function () {
    mutationEnhancer.unwatch()
  }
}



declare module "aurelia-templating" {
  interface ViewResources {
    elements: { [k: string]: unknown }
  }
}

class MutationEnhancer {
  private engine: TemplatingEngine;
  private container: Container;
  private enhanceSelector: string;
  private observer: MutationObserver;
  private bindingContext: unknown;

  constructor(private au: Aurelia) {

    this.container = au.container
    this.engine = au.container.get(TemplatingEngine)
  }
  watch(bindingContext?: unknown, applicationHost?: string | Element) {
    this.bindingContext = bindingContext
    this.enhanceSelector = Object.keys(this.au.resources.elements)
      .filter(x => ['compose', 'router-view'].indexOf(x) === -1)
      .map(x => x.toLowerCase()).join(',')

    this.observer = new MutationObserver((mutationList) => { this.onMutationcallback(mutationList) });
    this.observer.observe(PLATFORM.global.document, { childList: true, subtree: true, })
  }
  unwatch() {
    this.observer?.disconnect()
  }

  private onMutationcallback(mutationsList: MutationRecord[]) {


    for (const mutation of mutationsList) {
      if (mutation.type == 'childList') {
        // handle added nodes
        for (let i = 0; i < mutation.addedNodes.length; ++i) {
          const node = mutation.addedNodes[i];
          // only look at Element nodes
          if (node.nodeType != Node.ELEMENT_NODE) { continue }

          // If added node is not a custom element we can enhance
          // Look for it's childreen that we can enhance
          // Either way we'll get a collection of nodes after if/else
          // Probably empty
          let nodesToEnhance: Element[] | NodeList
          if (this.au.resources.getElement(node.nodeName.toLowerCase())) {
            nodesToEnhance = [node as Element]
          } else {
            nodesToEnhance = (node as Element).querySelectorAll(this.enhanceSelector)
          }

          for (let ni = 0; ni < nodesToEnhance.length; ni++) {
            const e = nodesToEnhance[ni] as Element;

            if (e.getAttribute('au-target-id')) {
              logger.debug('node already enchanced, attaching', e);
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              ((e as any).au.controller as Controller).attached()

            }
            else {
              this.engine.enhance({
                element: e,
                container: this.container,
                resources: this.au.resources,
                bindingContext: this.bindingContext
              })
            }
          }
        }

        for (let i = 0; i < mutation.removedNodes.length; i++) {
          const node = mutation.removedNodes[i];
          if (node.nodeType != Node.ELEMENT_NODE) {
            continue
          }
          let nodesToDetach: Element[] | NodeList
          if (this.au.resources.getElement(node.nodeName.toLowerCase())) {
            nodesToDetach = [node as Element]
          } else {
            nodesToDetach = (node as Element).querySelectorAll(this.enhanceSelector)
          }
          for (let ni = 0; ni < nodesToDetach.length; ni++) {
            const e = nodesToDetach[ni] as Element;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if (!(e as any).au) {
              logger.debug('No au-target-id on removed node. Node is removed before it was enhanced', e)

            }
            if (e.getAttribute('au-target-id')) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              ((e as any).au.controller as Controller).detached()
            }
          }
        }
      }
    }
  }
}
