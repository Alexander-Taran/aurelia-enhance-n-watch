import { bootstrap } from 'aurelia-bootstrapper';
import { Aurelia, inlineView, bindable, customElement } from 'aurelia-framework'
import { waitFor } from 'aurelia-testing';


const testFunctions = {

  onBind: function () { return },
  onUnbind: function () { return },
  onAttached: function () { return },
  onDetached: function () { return },
}

function oneFrame() {
  return new Promise((r) => setTimeout(r, 16))
}



@inlineView("<template><div>Hello ${message}</div></template>")
@customElement("hello-world")
class HelloWorld {
  @bindable message

  bind() {
    testFunctions.onBind()
  }
  unbind() {
    testFunctions.onUnbind()
  }

  attached() {
    testFunctions.onAttached()
  }
  detached() {
    testFunctions.onDetached()
  }
}



describe('enhance-n-watch', () => {


  let attachedSpy
  let detachedSpy
  let bindSpy
  let unbindSpy
  let consoleLogDebugSpy
  let aureliaInstance
  const bindingContext = {
    message: 'from Aurelia!'
  }

  function resetBindingContext() {
    bindingContext.message = 'from Aurelia!'
  }
  async function configure(aurelia: Aurelia) {
    aureliaInstance = aurelia
    aurelia.use
      .standardConfiguration()
      .globalResources(HelloWorld)
      // load the plugin ../src
      // The "resources" is mapped to "../src" in aurelia.json "paths"
      .feature('resources');

    return await aurelia.start().then(() => {
      aurelia.enhanceAndWatch(bindingContext)
    });
  }

  beforeAll((done) => {
    attachedSpy = spyOn(testFunctions, "onAttached")
    detachedSpy = spyOn(testFunctions, "onDetached")
    bindSpy = spyOn(testFunctions, "onBind")
    unbindSpy = spyOn(testFunctions, "onUnbind")

    consoleLogDebugSpy = spyOn(console, "debug")

    bootstrap(configure).then(() => done())
  })

  beforeEach((done) => {
    attachedSpy.calls.reset()
    detachedSpy.calls.reset()
    bindSpy.calls.reset()
    unbindSpy.calls.reset()
    resetBindingContext()
    done()
  })

  afterAll(async () => {

    document.documentElement.innerHTML = ''
    aureliaInstance.stopWatch()
    await oneFrame()
    expect(document.documentElement.innerText).toBe('')

    const host = document.createElement('div');
    host.innerHTML = "<hello-world message.bind=\"message\"></hello-world>";
    const component = host.children[0] // refenece to customElement
    document.body.appendChild(host);

    await oneFrame()
    expect(host.innerText.trim()).toBe('')
  })
  
  it('enhances component on dom mutation', async () => {

    // create some dome with CustomElement inside
    const host = document.createElement('div');
    host.innerHTML = "<hello-world message.bind=\"message\"></hello-world>";
    const component = host.children[0] // refenece to customElement
    document.body.appendChild(host);

    await oneFrame()
    expect(host.innerText.trim()).toBe('Hello from Aurelia!')
    expect(attachedSpy).toHaveBeenCalledTimes(1)
    expect(bindSpy).toHaveBeenCalledTimes(1)

    host.removeChild(component)
    await new Promise((r) => setTimeout(r, 16))
    expect(unbindSpy).toHaveBeenCalledTimes(1)
    expect(detachedSpy).toHaveBeenCalledTimes(1)

    bindingContext.message = "from surpise!"

    //read the component
    host.appendChild(component)
    await oneFrame()
    expect(bindSpy).toHaveBeenCalledTimes(2)
    expect(attachedSpy).toHaveBeenCalledTimes(2)
    expect(host.innerText.trim()).toBe('Hello from surpise!')
    expect(consoleLogDebugSpy).not.toHaveBeenCalledWith('node already enchanced, attaching', component)
  })

  it('reflects changes in binding context', async () => {

    // create some dome with CustomElement inside
    const host = document.createElement('div');
    host.innerHTML = "<hello-world message.bind=\"message\"></hello-world>";
    const component = host.children[0] // refenece to customElement
    document.body.appendChild(host);
    await oneFrame()
    expect(host.innerText.trim()).toBe('Hello from Aurelia!')
    bindingContext.message = "from test!"
    await oneFrame()
    expect(host.innerText.trim()).toBe('Hello from test!')
  })

  it('covers non element nodes', async () => {
    const host = document.createElement('div');
    host.innerHTML = "<ul><!-- comment node --><li><hello-world message.bind=\"message\"></hello-world></li></ul>";
    document.body.appendChild(host);
    await oneFrame()

    expect(host.innerText.trim()).toBe('Hello from Aurelia!')

    host.innerHTML = "<!-- component was here -->"
    expect(host.innerText.trim()).toBe('')


    host.innerHTML = "<ul><!-- comment node --><li><hello-world message.bind=\"message\"></hello-world></li></ul>";


  })

  it('enhances component deep in new dom node', async () => {
    const host = document.createElement('div');
    host.innerHTML = "<ul><!-- comment node --><li><hello-world message.bind=\"message\"></hello-world></li></ul>";
    document.body.appendChild(host);
    await oneFrame()

    expect(host.innerText.trim()).toBe('Hello from Aurelia!')

  })
})
