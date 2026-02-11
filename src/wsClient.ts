/*
 * @Date: 2026-01-19 15:42:59
 * @Author: kenny half-giser@outlook.com
 * @Description:
 * @LastEditors: kenny half-giser@outlook.com
 * @LastEditTime: 2026-02-01 10:24:54
 */
import { applyUpdate } from './hmr.ts'

const socket = new WebSocket('ws://localhost:8080/hmr')

socket.onopen = () => {
    console.log('Connected to the WebSocket server')
}

// Handle incoming HMR notifications
socket.onmessage = async event => {
    if (!event.data) return
    const payload = JSON.parse(event.data)
    const file = payload.file

    // Special handling for 'index' module:
    // Since index.js is the main entry loaded by bootstrap.js,
    // we need to re-execute it (with its initialization code).
    // We do this by re-importing the module with cache-busting.
    if (file === 'index') {
        console.log(`[HMR] imported index.js`)
        applyUpdate(file, null)
        return
    }

    // For other modules, apply the update
    const moduleUrl = `http://localhost:8080/dist/${file}.js?t=${Date.now()}`
    try {
        const mod = await import(moduleUrl)
        console.log(`[HMR] imported ${moduleUrl}`)
        applyUpdate(file, mod)
    } catch (err) {
        console.error(`[HMR] failed to import ${moduleUrl}:`, err)
    }
}

socket.onerror = error => {
    console.error('WebSocket error:', error)
}

socket.onclose = () => {
    console.log('Disconnected from the server')
}
