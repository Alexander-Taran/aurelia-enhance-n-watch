import { bootstrap } from 'aurelia-bootstrapper';
import { Aurelia, inlineView, bindable, customElement } from 'aurelia-framework'
import { waitFor } from 'aurelia-testing';

@inlineView("<template><div>Hello ${message}</div></template>")
@customElement("hello-world")
class HelloWorld {
  @bindable message
}

async function configure(aurelia: Aurelia) {
  aurelia.use
    .standardConfiguration()
    .globalResources(HelloWorld)
    // load the plugin ../src
    // The "resources" is mapped to "../src" in aurelia.json "paths"
    .feature('resources');

  return await aurelia.start().then(() => {
    aurelia.enhanceAndWatch({
      message: 'from Aurelia!'
    })
  });
}

describe('enhance-n-watch', () => {

  beforeAll((done) => {
    bootstrap(configure).then(() => done())
  })

  it('enhances component on dom mutation', done => {
    const host = document.createElement('div');
    host.innerHTML = "<hello-world message.bind=\"message\"></hello-world>";
    document.body.appendChild(host);
    setTimeout(() => {
      expect(host.innerText.trim()).toBe('Hello from Aurelia!')
      done()
    }, 16)

  })
})
