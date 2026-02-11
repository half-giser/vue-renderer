/*
 * @Date: 2026-01-12 17:52:10
 * @Author: kenny half-giser@outlook.com
 * @Description:
 * @LastEditors: kenny half-giser@outlook.com
 * @LastEditTime: 2026-02-11 16:11:39
 */
import './wsClient.ts'
import { unmount, Fragment } from './utils.ts'
import { browserApi as options } from './browser.ts'
import { createRenderer } from './renderer.ts'
import { createHotContext } from './hmr.ts'
import { effect, ref } from '@vue/reactivity'
import { type SelfHTMLElement } from './types/extends.ts'

let bol = ref(false)
let fragItems = ref([1, 2, 3])
let title = ref('Principle Of Implement Renderer')

let renderer = createRenderer(options)

let name = ref('test component name')
const component = {
    name: 'test-component',
    data: {} as () => { [key: string]: any },
    render: function () {
        return {
            tag: 'div',
            children: 'test component',
        }
    },
}

function mount() {
    effect(() => {
        const vnode = {
            tag: 'div',
            props: {
                id: 'hmr',
                key: 'hmr',
                onClick: bol.value
                    ? () => {
                          console.log('event bubble excuted')
                      }
                    : null,
            },
            children: [
                {
                    tag: 'h1',
                    key: 'header',
                    children: title.value,
                },
                {
                    tag: Fragment,
                    key: 'fragment',
                    children: fragItems.value.map(item => {
                        return {
                            tag: 'p',
                            key: item.toString(),
                            children: item.toString(),
                        }
                    }),
                },
                {
                    tag: component,
                    key: 'comp',
                    props: {
                        title: name.value,
                    },
                    children: [],
                },
                {
                    tag: 'button',
                    key: '',
                    props: {
                        disabled: false,
                        onClick: [
                            () => {
                                bol.value = true
                                console.log('trigger re-render action!')
                            },
                        ],
                    },
                    children: 'Button Test',
                },
            ],
        }
        renderer.render(vnode, document.getElementById('app'))
    })
}

// initial mount
mount()
// 元素增加测试
fragItems.value.unshift(1)
// 元素移动测试
const temp = fragItems.value[0]
fragItems.value[0] = fragItems.value[2]
// 元素删除测试
fragItems.value.splice(2, 1)

function dispose() {
    if (!document.getElementById('app')) return
    const app = document.getElementById('app') as SelfHTMLElement
    if (app && app.__vnode) unmount(app.__vnode)
}

// HMR: listen for renderer updates
const rendererHot = createHotContext('renderer')
rendererHot.accept((newRendererModule: any) => {
    if (
        newRendererModule &&
        typeof newRendererModule.createRenderer === 'function'
    ) {
        // swap in the new renderer implementation and re-render
        renderer = newRendererModule.createRenderer(options)
        try {
            dispose() // clean up old DOM
            mount() // re-mount with new renderer
        } catch (err) {
            console.error('[HMR] re-mount after renderer update failed', err)
        }
    }
})
