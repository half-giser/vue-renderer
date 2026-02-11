/*
 * @Date: 2026-01-17 16:51:28
 * @Author: kenny half-giser@outlook.com
 * @Description:
 * @LastEditors: kenny half-giser@outlook.com
 * @LastEditTime: 2026-02-04 10:25:27
 */
import { type SelfHTMLElement, type EventInvoker } from './types/extends.ts'

function shouldSetAsProps(el: HTMLElement, key: string) {
    const tagNames = ['INPUT', 'BUTTON', 'SELECT', 'TEXTAREA', 'FIELDSET']
    if (key === 'form' && tagNames.includes(el.tagName)) return false
    return key in el
}

export const browserApi = {
    setElementText: function (text: string, node: HTMLElement) {
        node.innerText = text
    },
    createElement: function (tag: string): HTMLElement {
        return document.createElement(tag)
    },
    bindAttribute: function <T extends keyof HTMLElement>(
        el: HTMLElement,
        key: T,
        value: string[] | string,
    ): void {
        const val = Array.isArray(value) ? value.join(',') : value
        if (shouldSetAsProps(el, key)) {
            // 能够在 DOM 对象上获取相应属性时，直接在 DOM 上赋值
            const type = typeof el[key]
            if (type === 'boolean' && value === '') {
                // 由于浏览器设置 Boolean 类型的值时，如果直接设置空字串，会导致 el[key] = false，因此需要特殊处理
                ;(el[key] as boolean) = true
            } else {
                ;(el[key] as string) = val
            }
        } else {
            // 无法在 DOM 对象上获取相应属性时，使用 setAttribute 方法赋值
            // 赋值 DOM 对象上的 class 属性，el.className 效率更高
            ;(key as string) === 'class'
                ? (el.className = val)
                : el.setAttribute(key, val)
        }
    },
    // T 通过 extends 关键字成为**泛型常量**，只能是 HTMLElementEventMap 有效键
    bindEvent: function <T extends keyof HTMLElementEventMap>(
        el: SelfHTMLElement<T>,
        key: T,
        preValue: (this: HTMLElement, ev: HTMLElementEventMap[T]) => any,
        value: (this: HTMLElement, ev: HTMLElementEventMap[T]) => any,
    ) {
        // 绑定在同个 DOM 上的事件可以多个，需要修改 el.__event 数据结构为 Record<K, T>
        let invokers =
            el.__event || (el.__event = {} as Record<T, EventInvoker<T>>)
        let invoker = invokers[key]
        if (value) {
            // 为了优化性能，使用更新响应事件的方式替代频繁移除/添加事件
            if (!invoker) {
                invoker = invokers[key] = ((e: HTMLElementEventMap[T]) => {
                    // 针对事件冒泡机制，如果触发事件时的时间戳早于在目标 DOM 上绑定事件的时间戳，那么不能让其执行
                    if (e.timeStamp < invoker.bindTime) return
                    // 绑定在同个 DOM 上的每类事件，都可以拥有多个 handlers，虽然不需要修改 el.__event 数据结构为 Record<K, EventInvoker<T>[]>
                    // 但是需要判断入参 value 是否为事件数组
                    if (invoker.value) {
                        if (Array.isArray(invoker.value)) {
                            invoker.value.forEach(fn => fn.call(el, e))
                        } else {
                            invoker.value.call(el, e)
                        }
                    }
                }) as EventInvoker<T>
                invoker.value = value
                invoker.bindTime = performance.now()
                el.addEventListener(key, invoker)
            } else {
                invoker.value = value
            }
        } else if (invoker) {
            el.removeEventListener(key, invoker)
            delete invokers[key]
        }
    },
    insert: function (el: HTMLElement, parent: HTMLElement) {
        parent.appendChild(el)
    },
    move: function (parent: HTMLElement, el: HTMLElement, anchor: HTMLElement) {
        parent.insertBefore(el, anchor)
    },
}
