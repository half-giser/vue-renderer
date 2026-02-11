/*
 * @Date: 2026-01-13 18:07:31
 * @Author: kenny half-giser@outlook.com
 * @Description:
 * @LastEditors: kenny half-giser@outlook.com
 * @LastEditTime: 2026-01-31 15:25:34
 */
import fs from 'node:fs'
import http from 'node:http'
import { fileURLToPath } from 'url'
import { WebSocketServer } from 'ws'
import { dirname, resolve, extname, basename } from 'path'

// 为实现热更新功能，导入转译工具
import { swcDir } from '@swc/cli'
import swcOptions from '../swcOpts.json' with { type: 'json' }
// 专门为调试准备的函数
import { inspect } from 'util'

const port = 8080
const host = 'localhost'
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
// 枚举所有的资源文件类型映射，通过静态文件名后缀映射到特定资源类型
const mimeTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.pdf': 'application/pdf',
}

let debounceTimer
const fileQueue = new Set()
const hmrWSS = new WebSocketServer({ noServer: true })
hmrWSS.on('connection', (ws, request) => {
    console.info(`${request.url}, wsserver start up!`)
})

// ws 建链后，对资源文件进行观察
fs.watch('./src', { recursive: true }, async (eventType, filename) => {
    if (!filename) return
    // 确保变更文件的唯一性，减少重复推送相同的变更信息到客户端
    fileQueue.add(filename)

    // 在节流的时间段内，只有没有文件的改动条件下，才会将变更信息推送给客户端
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
        for (const file of fileQueue) {
            // 编译逻辑......
            const targetPath = `./src/${file}`
            swcDir({
                cliOptions: {
                    outDir: './dist',
                    extensions: ['.ts'],
                    outFileExtension: 'js',
                    filenames: [targetPath],
                    stripLeadingPaths: true,
                },
                swcOptions,
                callbacks: {
                    onSuccess: () => {
                        // 转译成功后，主动推送消息“已更新文件名称”给浏览器，以此重新获取新的文件
                        hmrWSS.clients.forEach(ws => {
                            ws.send(
                                JSON.stringify({
                                    file: basename(file, '.ts'),
                                }),
                            )
                        })
                    },
                    onFail: err => {
                        console.log(
                            `compile file ${file} fail, because ${err}!`,
                        )
                    },
                },
            })
        }
        fileQueue.clear()
    }, 300)
})

const listener = async function (req, res) {
    console.log(`incoming messages: ${inspect(req.url)}`)
    let reqPath = req.url.split('?')[0]
    // 为了安全目的，封装资源路径，确保所有资源请求必须在 dist 目录下；
    const safePath =
        req.url === '/'
            ? resolve(__dirname, '../index.html')
            : resolve(__dirname, '..' + reqPath)
    fs.stat(safePath, (err, stat) => {
        // 校验请求的资源是否存在，并且是否为文件
        if (err || !stat.isFile()) {
            res.writeHead(404, { 'X-Content-Type-Options': 'nosniff' })
            res.end('File not found')
            return
        }
        const ext = extname(safePath).toLocaleLowerCase()
        const contentType = mimeTypes[ext] || 'application/octet-stream'
        // 资源存在且是文件时，获取文件后缀，并规定请求响应的资源映射类型
        res.setHeader('Content-Type', contentType)
        // 防止网络资源类型丢失攻击
        res.setHeader('X-Content-Type-Options', 'nosniff')
        // 强制客户端禁用缓存，保证每次资源请求都要重新进行
        res.setHeader('Cache-Control', 'no-store')
        res.writeHead(200)
        // 使用流形式获取文件资源，降低内存消耗
        const stream = fs.createReadStream(safePath)
        stream.pipe(res)
        stream.on('error', () => {
            // File might be deleted between stat() and createReadStream()
            res.writeHead(500, { 'X-Content-Type-Options': 'nosniff' })
            res.end('Server error')
        })
    })
}

const server = http.createServer()
// HTTP 静态资源服务
server.on('request', listener)
// HTTP -> WSS 升级服务
server.on('upgrade', (request, socket, head) => {
    const { pathname } = new URL(request.url, 'wss://base.url')
    if (pathname === '/hmr') {
        // HMR 服务
        hmrWSS.handleUpgrade(request, socket, head, ws => {
            hmrWSS.emit('connection', ws, request)
        })
    }
})
server.listen(port, host, () => {
    console.log(`Server is running on http://${host}:${port}`)
})
