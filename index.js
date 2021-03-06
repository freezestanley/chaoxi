import { importEntry } from 'html-entry'
import clearTemplate from './utils/clearTemplate'
import fragment from './utils/fragment'
import { getSandbox } from './utils/sandbox'
import EventEmitter from 'eventemitter2'

let globalEvent = window.____global_events || (window.____global_events = new EventEmitter({
    wildcard: true,
    delimiter: '.',
    newListener: false,
    maxListeners: Number.MAX_VALUE,
    verboseMemoryLeak: false
}))

class ctrlApps extends EventEmitter {
    constructor(appinfo) {
        super();
        this.sonApplication = []
        this.info = appinfo
        this.__baseUrl = appinfo.baseUrl || '' // 主引用的基本url
        this.name = appinfo.name || ''
        this.classNamespace = appinfo.classNamespace || ''
        this.agentPopState()
        this.parent = ''
    }
    get fullUrl() {
        return (this.parent.fullUrl || '') + this.__baseUrl
    }
    get baseUrl() {
        return this.__baseUrl
    }
    set baseUrl(val) {
        this.__baseUrl = val
    }
    findApp(name) {
        return this.sonApplication.find(function (app) {
            return name === app.name
        })
    }
    unregisterApps(name) {
        let index =  this.sonApplication.findIndex(function (app) {
            return name === app.name
        })
        if(index !== -1){
            this.sonApplication[index].destroy()
            this.sonApplication.splice(index, 1)
        }
    }
    _getAppBaseUrl(app){
        return this.baseUrl +  (app.baseUrl || '')
    }
    registerApps(applist) {
        const _self = this
        applist.forEach(
            async app => {
                const oldApp = _self.findApp(app.name)
                if (oldApp) {
                    oldApp.mounted = false
                    oldApp.contain = app.contain
                    oldApp.baseUrl = _self._getAppBaseUrl(app)
                    if (oldApp.app.canActive(oldApp.baseUrl)) {
                        oldApp.mount();
                    }
                    return
                }

                if (!app.canActive) {
                    app.canActive = () => true
                }
                
                let dll = window.__app_dll = window.__app_dll ? window.__app_dll : {}
                let template, execScripts, getExternalScripts, getExternalStyleSheets
                if (dll[app.entry]) {
                    const result = dll[app.entry]
                    template = result.template
                    execScripts = result.execScripts 
                    getExternalScripts = result.getExternalScripts 
                    getExternalStyleSheets = result.getExternalStyleSheets

                } else {
                    const result = await importEntry(app.entry)
                    template = result.template
                    execScripts = result.execScripts 
                    getExternalScripts = result.getExternalScripts 
                    getExternalStyleSheets = result.getExternalStyleSheets
                    dll[app.entry] = result
                }
                
                const sandbox = getSandbox()

                Promise.all([execScripts(sandbox), getExternalScripts(sandbox), getExternalStyleSheets()]).then(function(values){
                    const script = values[0]
                    const extScript = values[1]
                    const styles = values[2]
                    
                    app.template = template
                    app.styles = styles
                    const _module = sandbox[app.application_name]
                    if (_module && _module.__esModule) {
                        app.module = sandbox[app.application_name]
                        app.sandbox = sandbox
                        app.free = sandbox.__tailor_free;
                        let baseurl = _self._getAppBaseUrl(app)
                        app.baseUrl = baseurl.replace(/\/+/, '/')
                        const sonApplication = new fragment(app, _self)
                        sonApplication.bootstrap()
                        // delete window[app.name]
                        // window[app.name] = null
                        if (sonApplication.app.canActive(sonApplication.app.baseUrl)) {
                            sonApplication.mount()
                        }
                        _self.sonApplication.push(sonApplication)
                    } else {
                        console.error(`child application ${app.application_name} not found`);
                    }
                })
            }
        )
    }
    removeAllChild () {
        this.sonApplication.forEach(item => {
            item.destroy()
        })
        this.sonApplication = []
    }
    addChild (item) {
        this.sonApplication.push(item)
    }
    removeChild (name) {
       let index =  this.sonApplication.findIndex(function (ele) {
            return name === app.name
        })
        this.sonApplication.splice(index, 1)
        this.sonApplication[index].destroy()
    }
    agentPopState() {
        let _self = this
        window.addEventListener('popstate', function (e) {
            _self.sonApplication.forEach(item => {
                if (item.app.canActive(item.app.baseUrl)) {
                    item.mount()
                } else {
                    item.unmount()
                }
            })
        })
    }
}

// // const instanceApp = new ctrlApps()
// const init = function () {
//     window.addEventListener('load', function (e) {
//         clearTemplate()
//     })
// }
// init()
export default ctrlApps
export {
    globalEvent
}

