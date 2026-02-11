/*
 * @Date: 2026-01-17 17:09:35
 * @Author: kenny half-giser@outlook.com
 * @Description:
 * @LastEditors: kenny half-giser@outlook.com
 * @LastEditTime: 2026-02-11 10:43:10
 */
export interface ComponentNode {
    name: string
    props?: Record<string | symbol, unknown>
    data: () => { [key: string]: any }
    render?: (state: {}) => VNode
    setup?: (
        props: Readonly<Record<string, unknown>>,
        setupContext: Record<string, unknown>,
    ) => void | Record<string, unknown> // Vue3 Own
    beforeCreate?: () => void
    created?: () => void
    beforeMount?: () => void
    mounted?: () => void
    beforeUpdate?: () => void
    updated?: () => void
}
// sub-node can be many VNode, also can be string text
export interface VNode {
    tag: string | symbol | ComponentNode
    key?: string
    el?: HTMLElement | null
    props?: Record<string | symbol, unknown>
    children: VNode[] | string | null
    component?: Component
}

export class Component {
    state: Record<string | symbol, unknown> = {}
    props: Record<string | symbol, unknown> = {}
    subTree: VNode | undefined = undefined
    isMounted: boolean = false
}

export interface PlatformOptions {
    move: Function
    insert: Function
    bindEvent: Function
    createElement: Function
    setElementText: Function
    bindAttribute: Function
}
