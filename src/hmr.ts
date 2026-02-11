/*
 * @Date: 2026-01-29 16:45:36
 * @Author: kenny half-giser@outlook.com
 * @Description: Minimal HMR runtime inspired by Vite/Webpack concepts.
 * - createHotContext(id): used by modules to register accept/dispose handlers
 * - applyUpdate(id, newModule): called by the client when a module is dynamically imported
 * @LastEditors: kenny half-giser@outlook.com
 * @LastEditTime: 2026-02-01 10:07:44
 */
type AcceptHandler = (newModule: any) => void
type DisposeHandler = (data?: any) => void

interface HMRRecord {
    id: string
    acceptHandlers: AcceptHandler[]
    disposeHandlers: DisposeHandler[]
    data: any
}

const hmrMap = new Map<string, HMRRecord>()

function ensureRecord(id: string) {
    let r = hmrMap.get(id)
    if (!r) {
        r = { id, acceptHandlers: [], disposeHandlers: [], data: {} }
        hmrMap.set(id, r)
    }
    return r
}

export function createHotContext(id: string) {
    const record = ensureRecord(id)

    return {
        accept(cb: AcceptHandler) {
            record.acceptHandlers.push(cb)
        },
        dispose(cb: DisposeHandler) {
            record.disposeHandlers.push(cb)
        },
        // expose module-scoped data container
        data: record.data,
    }
}

export async function applyUpdate(id: string, newModule: any) {
    const record = hmrMap.get(id)

    // call dispose handlers first (old module cleanup)
    if (record) {
        for (const d of record.disposeHandlers) {
            try {
                d(record.data)
            } catch (err) {
                console.error('[HMR] dispose handler failed:', err)
            }
        }
    }

    // call accept handlers with new module
    if (record) {
        for (const a of record.acceptHandlers) {
            try {
                a(newModule)
            } catch (err) {
                console.error('[HMR] accept handler failed:', err)
            }
        }
    }

    // broadcast a global event so modules that didn't register can still react
    try {
        if (typeof window !== 'undefined' && 'CustomEvent' in window) {
            window.dispatchEvent(
                new CustomEvent('hmr:update', {
                    detail: { id, module: newModule },
                }),
            )
        }
    } catch (err) {
        // ignore
    }
}

export function listHMRRecords() {
    return Array.from(hmrMap.keys())
}

export function clearHMRRecords() {
    hmrMap.clear()
}
