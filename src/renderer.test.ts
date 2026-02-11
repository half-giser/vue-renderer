/*
 * @Date: 2026-01-31 17:35:00
 * @Author: kenny half-giser@outlook.com
 * @Description: Unit tests for renderer functionality
 * @LastEditors: kenny half-giser@outlook.com
 * @LastEditTime: 2026-02-07 10:49:50
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createRenderer } from './renderer.ts'
import { type VNode, type PlatformOptions } from './types/base.ts'
import { type SelfHTMLElement } from './types/extends.ts'

describe('Renderer Module', () => {
    let container: HTMLDivElement
    let mockOptions: PlatformOptions

    beforeEach(() => {
        container = document.createElement('div')
        container.id = 'test-container'

        mockOptions = {
            createElement: vi.fn((tag: string) => {
                const el = document.createElement(tag)
                return el
            }),
            insert: vi.fn((el: HTMLElement, parent: HTMLElement) => {
                parent.appendChild(el)
            }),
            move: vi.fn(),
            setElementText: vi.fn((text: string, node: HTMLElement) => {
                node.innerText = text
            }),
            bindAttribute: vi.fn(),
            bindEvent: vi.fn(),
        }
    })

    describe('createRenderer', () => {
        it('should return a renderer with render function', () => {
            const renderer = createRenderer(mockOptions)

            expect(renderer).toBeDefined()
            expect(typeof renderer.render).toBe('function')
        })
    })

    describe('render', () => {
        it('should create element when rendering to empty container', () => {
            const renderer = createRenderer(mockOptions)
            const vnode: VNode = {
                tag: 'div',
                children: [],
            }

            renderer.render(vnode, container)

            expect(container.children.length).toBe(1)
            expect(container.children[0].tagName).toBe('DIV')
        })

        it('should store vnode on container for future updates', () => {
            const renderer = createRenderer(mockOptions)
            const vnode: VNode = {
                tag: 'div',
                children: [],
            }

            renderer.render(vnode, container)

            const containerWithVnode = container as SelfHTMLElement
            expect(containerWithVnode.__vnode).toBe(vnode)
        })

        it('should unmount previous vnode when tag changes', () => {
            const renderer = createRenderer(mockOptions)

            const vnode1: VNode = {
                tag: 'div',
                children: [],
            }
            renderer.render(vnode1, container)
            expect(container.children.length).toBe(1)
            expect(container.children[0].tagName).toBe('DIV')

            const vnode2: VNode = {
                tag: 'span',
                children: [],
            }
            renderer.render(vnode2, container)

            expect(container.children.length).toBe(0)
            expect((container as SelfHTMLElement).__vnode).toBe(vnode2)
        })

        it('should not render when container is null', () => {
            const renderer = createRenderer(mockOptions)
            const vnode: VNode = {
                tag: 'div',
                children: [],
            }

            expect(() => {
                renderer.render(vnode, null)
            }).not.toThrow()
        })

        it('should unmount when rendering falsy vnode', () => {
            const renderer = createRenderer(mockOptions)

            const vnode1: VNode = {
                tag: 'div',
                children: [],
            }
            renderer.render(vnode1, container)
            expect(container.children.length).toBe(1)

            const vnodeFalsy: VNode = {
                tag: 'div',
                children: [],
                props: undefined,
            }
            renderer.render({ ...vnodeFalsy, props: null as any }, container)

            expect(container.children.length).toBe(1)
        })

        it('should handle text children', () => {
            const renderer = createRenderer(mockOptions)
            const vnode: VNode = {
                tag: 'div',
                children: 'Hello World',
            }

            renderer.render(vnode, container)

            const el = container.children[0] as HTMLElement
            expect(el.innerText).toBe('Hello World')
            expect(mockOptions.setElementText).toHaveBeenCalledWith(
                'Hello World',
                el,
            )
        })

        it('should handle nested element children', () => {
            const renderer = createRenderer(mockOptions)
            const childVNode: VNode = {
                tag: 'span',
                children: [],
            }
            const vnode: VNode = {
                tag: 'div',
                children: [childVNode],
            }

            renderer.render(vnode, container)

            const parentEl = container.children[0] as HTMLElement
            expect(parentEl.children.length).toBe(1)
            expect(parentEl.children[0].tagName).toBe('SPAN')
        })

        it('should call createElement with correct tag', () => {
            const renderer = createRenderer(mockOptions)
            const vnode: VNode = {
                tag: 'button',
                children: [],
            }

            renderer.render(vnode, container)

            expect(mockOptions.createElement).toHaveBeenCalledWith('button')
        })

        it('should insert element into container', () => {
            const renderer = createRenderer(mockOptions)
            const vnode: VNode = {
                tag: 'div',
                children: [],
            }

            renderer.render(vnode, container)

            expect(mockOptions.insert).toHaveBeenCalled()
        })

        it('should process event handlers', () => {
            const renderer = createRenderer(mockOptions)
            const clickHandler = vi.fn()
            const vnode: VNode = {
                tag: 'button',
                props: {
                    onClick: clickHandler,
                },
                children: [],
            }

            renderer.render(vnode, container)

            expect(mockOptions.bindEvent).toHaveBeenCalled()
        })

        it('should process non-event attributes', () => {
            const renderer = createRenderer(mockOptions)
            const vnode: VNode = {
                tag: 'input',
                props: {
                    id: 'test-input',
                    type: 'text',
                },
                children: [],
            }

            renderer.render(vnode, container)

            expect(mockOptions.bindAttribute).toHaveBeenCalledTimes(2)
        })

        it('should handle vnode without el property initially', () => {
            const renderer = createRenderer(mockOptions)
            const vnode: VNode = {
                tag: 'div',
                children: [],
            }

            renderer.render(vnode, container)

            expect(vnode.el).toBeDefined()
            expect(vnode.el).toBe(container.children[0])
        })
    })

    describe('element attributes', () => {
        it('should handle boolean attributes', () => {
            const renderer = createRenderer(mockOptions)
            const vnode: VNode = {
                tag: 'input',
                props: {
                    disabled: '',
                },
                children: [],
            }

            renderer.render(vnode, container)

            expect(mockOptions.bindAttribute).toHaveBeenCalled()
        })

        it('should handle string attributes', () => {
            const renderer = createRenderer(mockOptions)
            const vnode: VNode = {
                tag: 'a',
                props: {
                    href: 'https://example.com',
                },
                children: [],
            }

            renderer.render(vnode, container)

            expect(mockOptions.bindAttribute).toHaveBeenCalledWith(
                expect.any(HTMLElement),
                'href',
                'https://example.com',
            )
        })
    })

    describe('event handling', () => {
        it('should bind events using on*** prefix', () => {
            const renderer = createRenderer(mockOptions)
            const clickHandler = vi.fn()
            const vnode: VNode = {
                tag: 'button',
                props: {
                    onClick: clickHandler,
                },
                children: [],
            }

            renderer.render(vnode, container)

            expect(mockOptions.bindEvent).toHaveBeenCalledWith(
                expect.any(HTMLElement),
                'click',
                null,
                clickHandler,
            )
        })

        it('should convert event names to lowercase', () => {
            const renderer = createRenderer(mockOptions)
            const handler = vi.fn()
            const vnode: VNode = {
                tag: 'div',
                props: {
                    onMouseMove: handler,
                },
                children: [],
            }

            renderer.render(vnode, container)

            expect(mockOptions.bindEvent).toHaveBeenCalledWith(
                expect.any(HTMLElement),
                'mousemove',
                null,
                handler,
            )
        })
    })

    describe('multiple children', () => {
        it('should render multiple child elements', () => {
            const renderer = createRenderer(mockOptions)
            const vnode: VNode = {
                tag: 'ul',
                children: [
                    { tag: 'li', children: [] },
                    { tag: 'li', children: [] },
                    { tag: 'li', children: [] },
                ],
            }

            renderer.render(vnode, container)

            const ul = container.children[0] as HTMLElement
            expect(ul.children.length).toBe(3)
            expect(ul.children[0].tagName).toBe('LI')
            expect(ul.children[1].tagName).toBe('LI')
            expect(ul.children[2].tagName).toBe('LI')
        })
    })
})
