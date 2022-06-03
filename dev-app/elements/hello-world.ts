import {bindable, customElement} from 'aurelia-framework';

@customElement("hello-world")
export class HelloWorld {
  @bindable public message = '';
}
