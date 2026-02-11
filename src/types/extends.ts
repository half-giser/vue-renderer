/*
 * @Date: 2026-01-17 17:09:47
 * @Author: kenny half-giser@outlook.com
 * @Description:
 * @LastEditors: kenny half-giser@outlook.com
 * @LastEditTime: 2026-02-02 14:53:48
 */
import { type VNode } from './base.ts'

// 混合类型：既能代表事件本身，又能表达函数拥有自身属性
export interface EventInvoker<
    T extends keyof HTMLElementEventMap = keyof HTMLElementEventMap,
> {
    (this: HTMLElement, ev: HTMLElementEventMap[T]): any
    value?: (this: HTMLElement, ev: HTMLElementEventMap[T]) => any
    bindTime: number
}

export interface SelfHTMLElement<
    T extends keyof HTMLElementEventMap = keyof HTMLElementEventMap,
> extends HTMLElement {
    __vnode?: VNode
    __event?: Record<T, EventInvoker<T>>
}
