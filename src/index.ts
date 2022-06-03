import { FrameworkConfiguration, Aurelia, Controller, PLATFORM, Container, TemplatingEngine } from "aurelia-framework";
import { getLogger } from "aurelia-logging";

const logger = getLogger("enhance-watch")

declare module "aurelia-framework" {
  interface Aurelia {
    enhanceAndWatch(bindingContext?: Object, applicationHost?: string | Element): Promise<Aurelia>
    stopWatch(): void
  }
}

export function configure(config: FrameworkConfiguration) {
  //config.globalResources([]);
  config.aurelia
  const me = new MutationEnhancer(config.aurelia)
  config.aurelia.enhanceAndWatch = async function (bindingContext?: Object, applicationHost?: string | Element) {
    me.watch(bindingContext, applicationHost)
    logger.info("calling .enhance()")
    return this.enhance(bindingContext, applicationHost)
  }
  config.aurelia.stopWatch = async function () {
    me.unwatch()
  }
}



declare module "aurelia-templating" {
  interface ViewResources {
    elements: {}
  }
}

class MutationEnhancer {
  private engine: TemplatingEngine;
  private container: Container;
  private enhanceSelector: string;
  observer: MutationObserver;
  bindingContext: object;

  constructor(private au: Aurelia) {

    this.container = au.container
    this.engine = au.container.get(TemplatingEngine)
  }
  watch(bindingContext?: object, applicationHost?: string | Element) {
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


    for (var mutation of mutationsList) {

      if (mutation.type == 'childList') {


        for (var i = 0; i < mutation.addedNodes.length; i++) {
          let n = mutation.addedNodes[i];
          if (n.nodeType != Node.ELEMENT_NODE) {
            continue
          }
          let nodes: Element[] | NodeList
          if (this.au.resources.getElement(n.nodeName.toLowerCase())) {
            nodes = [n as Element]
          } else {
            nodes = (n as Element).querySelectorAll(this.enhanceSelector)
          }
          for (let ni = 0; ni < nodes.length; ni++) {
            let e = nodes[ni] as Element;

            if (e.getAttribute('au-target-id')) {
              logger.warn('node already enchanced', e);
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
        for (var i = 0; i < mutation.removedNodes.length; i++) {
          let n = mutation.removedNodes[i];
          if (n.nodeType != Node.ELEMENT_NODE) {
            continue
          }
          let nodes: Element[] | NodeList
          if (this.au.resources.getElement(n.nodeName.toLowerCase())) {
            nodes = [n as Element]
          } else {
            nodes = (n as Element).querySelectorAll(this.enhanceSelector)
          }
          for (let ni = 0; ni < nodes.length; ni++) {
            let e = nodes[ni] as Element;
            if (!(e as any).au) {
              logger.warn('no au-target-id on removed node', e)

            }
            if (e.getAttribute('au-target-id')) {

              ((e as any).au.controller as Controller).detached()
            }

          }
        }
      }
    }
  }
}
