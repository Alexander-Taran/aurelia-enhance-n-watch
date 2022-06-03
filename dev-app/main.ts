import { Aurelia } from 'aurelia-framework';
import { bootstrap } from 'aurelia-bootstrapper'
import { HelloWorld } from './elements/hello-world';
import environment from './environment';

function configure(aurelia: Aurelia): void {
  aurelia.use
    .standardConfiguration()
    .globalResources(HelloWorld)
    // load the plugin ../src
    // The "resources" is mapped to "../src" in aurelia.json "paths"
    .feature('resources');

  aurelia.use.developmentLogging(environment.debug ? 'debug' : 'warn');

  if (environment.testing) {
    aurelia.use.plugin('aurelia-testing');
  }

  aurelia.start().then(() => {
    debugger
    aurelia.enhanceAndWatch({
      message: 'from Aurelia!'
    })
  });
}
debugger
bootstrap(configure)
