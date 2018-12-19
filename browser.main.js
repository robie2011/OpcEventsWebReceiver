// https://websocket.org/echo.html


/**
 * 
 * @param {string} name 
 * @returns {HTMLElement}
 */
const getByClass = name => {
    let htmlCollection = document.getElementsByClassName(name)
    let result = []
    for (let index = 0; index < htmlCollection.length; index++) {
        const element = htmlCollection[index];
        result.push(element)
    }

    return result
}

const metricOutput = document.getElementById("metricOutput");
const status = document.getElementById('status')
console.info("for debug messages set:")
console.info("      window.enableDebug = true")


let websocket = null
const connect = opcUrl => {
    if (websocket) websocket.close()

    websocket = new WebSocket(opcUrl)
    websocket.onerror = console.error;
    websocket.onopen = () => {
        getByClass('online-only').forEach(e => e.classList.add('is-online'))
        getByClass('offline-only').forEach(e => e.classList.add('is-online'))
        status.classList.remove('badge-danger')
        status.classList.add('badge-success')
        status.innerText = 'open'
    }

    websocket.onclose = () => {
        getByClass('online-only').forEach(e => e.classList.remove('is-online'))
        getByClass('offline-only').forEach(e => e.classList.remove('is-online'))
        status.classList.remove('badge-success')
        status.classList.add('badge-danger')
        status.innerText = 'closed'
    }

    let lastEvents = []
    websocket.onmessage = msg => {
        if (window.enableDebug) console.log(msg.data)

        if (msg.data.startsWith("[{")) {
            let incomingEvents = JSON.parse(msg.data)

            // replacing old events with new one
            incomingEvents.forEach(e => {
                e.isNew = true
                let idx = lastEvents.findIndex(x => x.clientHandle === e.clientHandle)
                if (idx > -1) {
                    lastEvents[idx] = e
                    lastEvents[idx]
                } else {
                    lastEvents.push(e)
                }
            })
        }


        metricOutput.innerHTML = lastEvents
            .map(knownValueConverter)
            .map(createMetricOutput)
            .map(o => `<div class="node">${o}</div>`)
            .join("\r\n")

        lastEvents.forEach(e => e.isNew = false)
    }

    

}

const knownTypes = {
    "ns=2;s=Gateway.PLC1.65NT-06402-D001.PLC1.microgrid.strRead.strEnergiemessung.strELM01_P801.rSumWirkleistung": "float",
    "ns=2;s=Demo.Dynamic.Scalar.DateTime": "DateTime"
}

const knownValueConverter = obj => {
    let nodeId = `ns=${obj.namespace};s=${obj.node}`
    let v = obj.value
    if (knownTypes[nodeId]) {
        if (knownTypes[nodeId] === 'float') {
            v = Number(v).toFixed(3)
        }

        // if (knownTypes[nodeId] == 'DateTime'){
        //     v = new Date(v).toISOString()
        // }
    }

    obj.timestamp = new Date(obj.timestamp).toISOString()
    obj.value = v
    return obj
}

const createMetricOutput = obj => {
    let nodeId = `ns=${obj.namespace};s=${obj.node}`
    let shouldFlash = obj.isNew ? 'flash' : 'noflash'
    var tmpl = `
<h4><span class="badge badge-info">${nodeId}</span></h4>

<h3 class="display-3">
<p class="badge badge-dark" style="font-family: 'Courier New', Courier, monospace;"> <i class="fas fa-heart ${shouldFlash}"></i> ${obj.value}</p> 
</h3>
<p class="text-muted"> source time: ${obj.timestamp}</p>
`
    return tmpl
}

