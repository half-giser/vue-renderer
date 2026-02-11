/*
 * @Date: 2026-01-13 15:08:49
 * @Author: kenny half-giser@outlook.com
 * @Description:
 * @LastEditors: kenny half-giser@outlook.com
 * @LastEditTime: 2026-02-11 11:04:46
 */
import {
    effect,
    reactive,
    shallowReactive,
    shallowReadonly,
} from '@vue/reactivity'
import {
    unmount,
    microQueue,
    Fragment,
    pickProps,
    judgeChanged,
} from './utils.ts'
import {
    type VNode,
    Component,
    ComponentNode,
    PlatformOptions,
} from './types/base.ts'
import { type SelfHTMLElement, EventInvoker } from './types/extends.ts'

export function createRenderer(options: PlatformOptions) {
    // 封装跟渲染平台相关的功能函数，保证本渲染器逻辑适配各种平台
    const {
        move,
        insert,
        bindEvent,
        bindAttribute,
        createElement,
        setElementText,
    } = options

    function mount(
        vnode: VNode,
        container: SelfHTMLElement | null | undefined,
        anchor: SelfHTMLElement | null | undefined,
    ) {
        const el = createElement(vnode.tag)
        // 后续真实 DOM 处理需要有处理入口，故通过 vnode.el 属性建立虚拟DOM 与真实DOM 连接
        vnode.el = el
        // 为目标元素 el，进行属性/事件的绑定
        if (vnode.props) {
            for (const key in vnode.props) {
                // 通过 on*** 前缀匹配后，区分事件/普通属性
                if (/^on/.test(key)) {
                    bindEvent(
                        el,
                        key.slice(2).toLowerCase(),
                        null,
                        vnode.props[key],
                    )
                } else {
                    bindAttribute(el, key, vnode.props[key])
                }
            }
        }
        // 为目标元素 el，添加子节点
        if (typeof vnode.children === 'string') {
            setElementText(vnode.children, el)
        } else {
            // VNode 具有树状结构: 递归调用 patch 函数
            const subElements = vnode.children
            subElements?.forEach(subNode => {
                patch(undefined, subNode, el)
            })
        }
        if (anchor) {
            move(container, el, anchor)
        } else {
            insert(el, container)
        }
    }

    function patchProps<T extends keyof HTMLElementEventMap>(
        container: SelfHTMLElement<T> | null,
        key: T,
        previewProps: EventInvoker<T>,
        nextProps: EventInvoker<T> | null,
    ) {}

    /**
     * 使用简易差异算法，核心逻辑在于实现已存在 DOM 移动到最新位置的方式
     * -- 首先遍历新虚拟节点集合，
     *      如果能在旧虚拟节点集合中找出可复用 DOM，则将其移动至正确位置
     *      否则说明需要对该最新虚拟节点进行 mount 操作，并且将生成的 DOM 移动到正确的位置
     * -- 然后遍历旧虚拟节点集合，
     *      找到过期的虚拟节点，直接进行 unmount 操作
     * 总结：本算法需要经过两轮双层遍历操作，
     *      在基于新虚拟节点集合遍历操作中，完成新元素加载并移动、已有元素移动两种动作；
     *      在基于旧虚拟节点集合遍历操作中，完成过期元素卸载动作
     */
    function simpleDiffAlgorithm(
        n1: VNode,
        n2: VNode,
        container: SelfHTMLElement | null | undefined,
    ) {
        const oldNodes = n1.children as (VNode | undefined)[]
        const newNodes = n2.children as VNode[]
        const oldLen = oldNodes.length
        const newLen = newNodes.length
        let lastOldNodeIndex = 0
        for (let i = 0; i < newLen; i++) {
            let exsitInOldNodes = false
            const newNode = newNodes[i]
            for (let j = 0; j < oldLen; j++) {
                const oldNode = oldNodes[j]
                if (!oldNode) continue
                // 处理已存在虚拟节点
                if (newNode.key === oldNode.key) {
                    exsitInOldNodes = true
                    patch(oldNode, newNode, container)
                    // 通过每个节点特有的 key 属性，确保更新前后节点的映射正确
                    if (j < lastOldNodeIndex) {
                        // 找到需要移动的虚拟节点，使用移动节点方式替代加载/卸载 DOM，能显著提高更新性能
                        const previewVNode = newNodes[i - 1]
                        if (previewVNode) {
                            const anchor = previewVNode.el?.nextSibling
                            move(container, newNode.el, anchor)
                        }
                    } else {
                        lastOldNodeIndex = j
                    }
                }
            }
            // 处理新增虚拟节点
            if (!exsitInOldNodes) {
                // 旧节点集合中，找不到存在的本节点时，说明需要新增本节点
                const previewVNode = newNodes[i - 1]
                // 定义新节点接入的锚点元素
                let anchor
                if (previewVNode) {
                    anchor = previewVNode.el?.nextSibling
                } else {
                    anchor = container?.firstChild
                }
                // 加载新增节点
                patch(
                    undefined,
                    newNodes[i],
                    container,
                    anchor as SelfHTMLElement,
                )
            }
        }
        // 处理过期虚拟节点
        for (let i = 0; i < oldLen; i++) {
            const oldNode = oldNodes[i]
            if (!oldNode) continue
            const isLegacy =
                newNodes.findIndex(node => node.key === oldNode.key) === -1
            if (isLegacy) {
                unmount(oldNode)
            }
        }
    }

    function doubleEndAlgorithm(
        n1: VNode,
        n2: VNode,
        container: SelfHTMLElement | null | undefined,
    ) {
        const oldNodes = n1.children as VNode[]
        const newNodes = n2.children as VNode[]
        // 定义新旧节点集合指针
        let oldStartInx = 0,
            newStartInx = 0
        let oldEndInx = oldNodes.length - 1,
            newEndInx = newNodes.length - 1

        // 定义新旧节点集合各自首尾节点
        let oldStartNode = oldNodes[oldStartInx],
            newStartNode = newNodes[newStartInx]
        let oldEndNode = oldNodes[oldEndInx],
            newEndNode = newNodes[newEndInx]

        while (oldStartInx <= oldEndInx && newStartInx <= newEndInx) {
            // 每一轮都有 4 步比较操作：旧首 <-> 新首、旧尾 <-> 新尾、旧首 <-> 新尾、旧尾 <-> 新首
            // 理想情况下，这四步比较必然会有一个发生
            if (!oldStartNode) {
                oldStartNode = oldNodes[++oldStartInx]
            } else if (!oldEndNode) {
                oldEndNode = oldNodes[--oldEndInx]
            } else if (oldStartNode.key === newStartNode.key) {
                // 因为处于两个集合的同一位置，故而只要更新内容，不需要移动位置
                patch(oldStartNode, newStartNode, container)
                // 处理完后，更新 oldStartNode newStartNode 为各自集合中的下一个节点
                oldStartNode = oldNodes[++oldStartInx]
                newStartNode = newNodes[++newStartInx]
            } else if (oldEndNode.key === newEndNode.key) {
                patch(oldEndNode, newEndNode, container)
                oldEndNode = oldNodes[--oldEndInx]
                newEndNode = newNodes[--newEndInx]
            } else if (oldEndNode.key === newStartNode.key) {
                patch(oldEndNode, newStartNode, container)
                // 将旧节点集合中的尾部节点对应的 DOM，移动至旧节点头部节点对应 DOM 之前
                move(container, oldEndNode.el, oldStartNode.el)
                // 移动完成之后，更新 oldEndNode 为旧节点集合中倒数第二个节点；更新 oldStartNode 为新节点集合中第二个节点
                oldEndNode = oldNodes[--oldEndInx]
                newStartNode = newNodes[++newStartInx]
            } else if (oldStartNode.key === newEndNode.key) {
                patch(oldStartNode, newEndNode, container)
                move(container, oldStartNode.el, oldEndNode.el?.nextSibling)
                oldStartNode = oldNodes[++oldStartInx]
                newEndNode = newNodes[--newEndInx]
            } else {
                // 非理想状况下，也就是上述所有都不发生的情况
                const oldFirstInx = oldNodes.findIndex(
                    node => node.key === newStartNode.key,
                )
                if (oldFirstInx > 0) {
                    // 能找到可复用 DOM 时，进行更新、移动操作
                    const toMoveNode = oldNodes[oldFirstInx]
                    patch(toMoveNode, newStartNode, container)
                    move(container, toMoveNode.el, oldStartNode.el)
                    // 完成目标节点 DOM 元素移动后，置空 toMoveNode -> undefined;
                    // @ts-ignore
                    oldNodes[oldFirstInx] = undefined
                    // 更新新首节点
                    newStartNode = newNodes[++newStartInx]
                } else {
                    // 无法找到可复用 DOM，进行新虚拟节点对应元素 mount 操作，并且将新生成的元素放在旧头部节点之前
                    patch(
                        undefined,
                        oldNodes[oldFirstInx],
                        container,
                        oldStartNode.el,
                    )
                    // 更新新首节点
                    newStartNode = newNodes[++newStartInx]
                }
            }
        }

        // 通过多轮比较后，其实还有新增、删除场景未被完全覆盖
        if (oldEndInx < oldStartInx && newStartInx <= newEndInx) {
            // 旧有虚拟节点被完全遍历后，仍然有未被遍历的新虚拟节点时
            // 那么这些新虚拟节点要依次 mount
            for (let i = newStartInx; i <= newEndInx; i++) {
                const anchor = newNodes[newStartInx + 1]
                    ? newNodes[newStartInx + 1].el
                    : undefined
                patch(undefined, newNodes[newStartInx], container, anchor)
            }
        } else if (newEndInx < newStartInx && oldStartInx <= oldEndInx) {
            // 新虚拟节点被完全遍历后，仍然还有旧虚拟节点未完全遍历时
            // 那么这个旧虚拟节点要依次 unmount
            for (let i = oldStartInx; i <= oldEndInx; i++) {
                unmount(oldNodes[i])
            }
        }
    }

    function mountComponent(
        n1: VNode,
        container: SelfHTMLElement | null | undefined,
        anchor: SelfHTMLElement | null | undefined = undefined,
    ) {
        const compOption = n1.tag as ComponentNode
        let { props: propsOption, data, render, setup } = compOption
        const state = data ? reactive(data()) : null
        // 选出能被组件接收的属性 props，通过浅式响应放入组件实例
        const [props, attrs] = pickProps(propsOption, n1.props)
        // 挂载组件后，进行组件更新时，需要构建 Component Instance
        // 维护组件的生命周期和状态(有可用的旧的 subTree:VNode)
        const instance = {
            state,
            props: shallowReactive(props),
            isMounted: false,
            subTree: undefined,
        } as Component
        // 为后续新旧组件更新做准备
        n1.component = instance
        // 兼容 Vue3 入口 setup，完成传统 data/render 方法的工作
        let setupState: Record<string, unknown> | null = null
        const setupContext = { attrs }
        const setupResult = setup && setup(shallowReadonly(props), setupContext)
        if (typeof setupResult === 'function') {
            if (render) {
                console.warn('confict with render option')
            }
            render = setupResult
        } else {
            setupResult && (setupState = setupResult)
        }

        // 为从同一个接口使用组件本身 state、props、methods 等数据（完成组件内部渲染），
        // 需要构造代理对象 renderContext，截断组件实例 state/props
        const renderContext = new Proxy(instance, {
            get(t, k, r) {
                const { state, props } = t
                if (state && typeof k === 'string' && k in state) {
                    return (state as Record<string, unknown>)[k]
                } else if (props && typeof k === 'string' && k in props) {
                    return (props as Record<string, unknown>)[k]
                } else if (
                    setupState &&
                    typeof k === 'string' &&
                    k in setupState
                ) {
                    return (setupState as Record<string, unknown>)[k]
                }
                return undefined
            },
            set(t, k, v, r) {
                const { state, props } = t
                if (state && typeof k === 'string' && k in state) {
                    ;(state as Record<string, unknown>)[k] = v
                    return true
                } else if (props && typeof k === 'string' && k in props) {
                    console.warn(
                        `Attempting to mutate property "${String(k)}", Parent property is read-only`,
                    )
                    return false
                } else if (
                    setupState &&
                    typeof k === 'string' &&
                    k in setupState
                ) {
                    ;(setupState as Record<string, unknown>)[k] = v
                    return true
                }
                return false
            },
        })
        effect(
            () => {
                if (render) {
                    const subTree = render.call(renderContext, renderContext)
                    if (instance.isMounted) {
                        // 组件更新时，按照 patch 逻辑，一定会进入 patchComponent 流程
                        patch(instance.subTree, subTree, container, anchor)
                    } else {
                        patch(undefined, subTree, container, anchor)
                        instance.isMounted = true
                    }
                    instance.subTree = subTree
                }
            },
            {
                // 利用配置:scheduler，控制在组件更新时能做到每个副作用仅仅更新一次，优化应用性能
                scheduler: microQueue,
            },
        )
    }

    function patchComponent(
        n1: VNode,
        n2: VNode,
        anchor: SelfHTMLElement | null | undefined = undefined,
    ) {
        let instance = (n2.component = n1.component) as Component
        const { props } = instance
        if (judgeChanged(n1.props, n2.props)) {
            const type = n2.tag as ComponentNode
            const [nextProps] = pickProps(type.props, n2.props)
            for (const key in nextProps) {
                props[key] = nextProps[key]
            }

            for (const key in props) {
                if (!(key in nextProps)) {
                    delete props[key]
                }
            }
        }
    }

    function patchChildren(
        n1: VNode,
        n2: VNode,
        container: SelfHTMLElement | null | undefined,
    ) {
        if (typeof n2.children === 'string') {
            // 当新子节点类型为字符串
            if (Array.isArray(n1.children)) {
                // 并且旧节点类型为 VNode[] 时，需要一个个的卸载
                n1.children.forEach(node => unmount(node))
            }
            setElementText(n2.children, container)
        } else if (Array.isArray(n2.children)) {
            // 当新子节点类型为 VNode[]
            if (typeof n1.children === 'string') {
                setElementText('', container)
                n2.children.forEach(node => patch(undefined, node, container))
            } else if (Array.isArray(n1.children)) {
                // 新旧子节点比较，涉及差异算法
                // simpleDiffAlgorithm(n1, n2, container)
                doubleEndAlgorithm(n1, n2, container)
            }
        } else {
            // 新子节点不存在时
            if (Array.isArray(n1.children)) {
                n1.children.forEach(node => unmount(node))
            } else if (typeof n1.children === 'string') {
                setElementText('', container)
            }
        }
    }

    function patchElement(v1: VNode | undefined, v2: VNode) {
        if (v1) {
            const el = (v2.el = v1.el)
            // 首先更新 props
            // const oldProps = v1.props
            // const newProps = v2.props
            // for (const key in newProps) {
            //     if (oldProps && newProps[key] !== oldProps[key]) {
            //         patchProps(
            //             el,
            //             key as keyof HTMLElementEventMap,
            //             oldProps[key],
            //             newProps[key],
            //         )
            //     }
            // }
            // for (const key in oldProps) {
            //     if (!(newProps && key in newProps)) {
            //         patchProps(
            //             el,
            //             key as keyof HTMLElementEventMap,
            //             oldProps[key],
            //             null,
            //         )
            //     }
            // }
            // 再更新 sub_nodes
            patchChildren(v1, v2, el)
        }
    }

    function patch(
        v1: VNode | undefined,
        v2: VNode,
        container: SelfHTMLElement | null | undefined,
        anchor: SelfHTMLElement | null | undefined = undefined,
    ) {
        if (!v1) {
            // 创建真实 DOM
            if (v2.tag === Fragment) {
                if (Array.isArray(v2.children)) {
                    v2.children.forEach(node =>
                        patch(undefined, node, container),
                    )
                } else {
                    patch(undefined, v2, container)
                }
            } else if (typeof v2.tag === 'string') {
                mount(v2, container, anchor)
            } else if (typeof v2.tag === 'object') {
                mountComponent(v2, container, anchor)
            }
        } else {
            if (v1.tag !== v2.tag) {
                // 首先判断是否描述的是同一元素，不是，直接移除旧节点
                unmount(v1)
            }
            // 更新真实 DOM
            const { tag } = v2
            if (tag === Fragment) {
                patchChildren(v1, v2, container)
            } else if (typeof tag === 'string') {
                patchElement(v1, v2)
            } else if (typeof tag === 'object') {
                patchComponent(v1, v2, anchor)
            }
        }
    }

    function render(vnode: VNode, container: SelfHTMLElement | null) {
        if (container) {
            if (vnode) {
                patch(container.__vnode, vnode, container)
            } else {
                if (container.__vnode) {
                    // 渲染空新节点时，只在拥有旧节点 DOM 时，执行平台提供的方法移除旧 DOM
                    unmount(container.__vnode)
                }
            }
            container.__vnode = vnode
        }
    }

    return { render }
}
