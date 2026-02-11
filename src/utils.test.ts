/*
 * @Date: 2026-01-31 17:30:00
 * @Author: kenny half-giser@outlook.com
 * @Description: Unit tests for utility functions
 * @LastEditors: kenny half-giser@outlook.com
 * @LastEditTime: 2026-01-31 17:30:00
 */
import { describe, it, expect } from 'vitest'
import { unmount } from './utils.ts'
import { type VNode } from './types/base.ts'

describe('Utils Module', () => {
    describe('unmount', () => {
        it('should remove element from DOM when parent exists', () => {
            const container = document.createElement('div')
            const child = document.createElement('div')
            child.id = 'test-child'
            container.appendChild(child)

            const vnode: VNode = {
                tag: 'div',
                el: child,
                children: [],
            }

            expect(container.contains(child)).toBe(true)

            unmount(vnode)

            expect(container.contains(child)).toBe(false)
            expect(container.children.length).toBe(0)
        })

        it('should not throw when element has no parent', () => {
            const element = document.createElement('div')
            const vnode: VNode = {
                tag: 'div',
                el: element,
                children: [],
            }

            expect(() => {
                unmount(vnode)
            }).not.toThrow()
        })

        it('should not throw when element is undefined', () => {
            const vnode: VNode = {
                tag: 'div',
                children: [],
            }

            expect(() => {
                unmount(vnode)
            }).not.toThrow()
        })

        it('should handle element with no el property', () => {
            const vnode: VNode = {
                tag: 'div',
                children: [],
            }

            expect(() => {
                unmount(vnode)
            }).not.toThrow()
        })

        it('should handle nested elements correctly', () => {
            const container = document.createElement('div')
            const parent = document.createElement('div')
            const child1 = document.createElement('span')
            const child2 = document.createElement('span')

            parent.appendChild(child1)
            parent.appendChild(child2)
            container.appendChild(parent)

            const vnode: VNode = {
                tag: 'div',
                el: parent,
                children: [],
            }

            expect(container.contains(parent)).toBe(true)

            unmount(vnode)

            expect(container.contains(parent)).toBe(false)
            expect(container.children.length).toBe(0)
        })

        it('should handle element already removed from DOM', () => {
            const element = document.createElement('div')
            const container = document.createElement('div')
            container.appendChild(element)
            container.removeChild(element)

            const vnode: VNode = {
                tag: 'div',
                el: element,
                children: [],
            }

            expect(() => {
                unmount(vnode)
            }).not.toThrow()
        })
    })
})
