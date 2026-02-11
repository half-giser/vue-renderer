/*
 * @Date: 2026-01-29 18:30:00
 * @Author: kenny
 * @Description: Bootstrap script - dynamically imports the main entry module
 * This allows HMR to work: we can re-import the main module with cache-busting
 * (time-stamp in query string) without reloading the HTML page.
 */

interface HMRDetail {
    id: string
    module?: any
}

interface HMRUpdateEvent extends CustomEvent {
    detail: HMRDetail
}

const entryListener = (e: Event) => {
    const event = e as HMRUpdateEvent
    if (event.detail?.id === 'index') {
        console.log('[Bootstrap] Re-executing bootstrap due to index update')
        window.removeEventListener('hmr:update', entryListener)
        main()
    }
}

async function main() {
    await import(`./index.js`)
}

main().catch(err => {
    console.error('[Bootstrap] Failed to load main module:', err)
})

window.addEventListener('hmr:update', entryListener)
