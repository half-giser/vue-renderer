/*
 * @Date: 2026-01-23 10:51:56
 * @Author: kenny half-giser@outlook.com
 * @Description:
 * @LastEditors: kenny half-giser@outlook.com
 * @LastEditTime: 2026-02-07 17:29:26
 */
import { type VNode } from './types/base.ts'

// 用来表达 Fragment 元素类型，dom 标准库中没有这种类型的元素
export const Fragment = Symbol()

export function unmount(vnode: VNode) {
    if (vnode.tag === Fragment && Array.isArray(vnode.children)) {
        vnode.children.forEach(node => unmount(node))
        return
    }

    const parent = vnode.el?.parentNode
    if (parent && vnode.el) parent.removeChild(vnode.el)
}

let isBlocking = false
const tasks = new Set() as Set<Function>
const p = Promise.resolve()
export function microQueue(task: Function) {
    tasks.add(task)
    // 利用全局变量 isBlocking，控制仅在首次开启异步任务，直到首次异步任务执行后，才允许再次触发下次异步任务
    if (!isBlocking) {
        isBlocking = true
        // 利用异步任务的特点：开启异步任务后，只有等到执行栈完全执行后，才会从异步队列中取出头部任务执行
        p.then(() => {
            tasks.forEach(task => task())
        }).finally(() => {
            tasks.clear()
            isBlocking = false
        })
    }
}

/**
 * 从被提供的属性集中，找出能被接收的属性存储在 props，其他的属性直接存储在 attrs
 * @param acceptProps
 * @param providerProps
 * @returns [props, attrs]
 */
export function pickProps(
    acceptProps: Record<string, unknown> | undefined,
    providerProps: Record<string, unknown> | undefined,
): [Record<string, unknown>, Record<string, unknown>] {
    const props: Record<string, unknown> = {}
    const attrs: Record<string, unknown> = {}

    if (acceptProps && providerProps) {
        for (const prop in providerProps) {
            if (prop in acceptProps) {
                props[prop] = providerProps[prop]
            } else {
                attrs[prop] = providerProps[prop]
            }
        }
    }

    return [props, attrs]
}

export function judgeChanged(
    prevObj: Record<string, unknown> | undefined,
    nextObj: Record<string, unknown> | undefined,
) {
    if ((prevObj && !nextObj) || (!prevObj && nextObj)) {
        return false
    } else if (!prevObj && !nextObj) {
        return true
    } else if (prevObj && nextObj) {
        const keys = Object.keys(nextObj)
        if (keys.length !== Object.keys(prevObj).length) return true
        for (const key of keys) {
            if (prevObj[key] !== nextObj[key]) {
                return true
            }
        }
    }
    return false
}
