/*
 * @Date: 2026-01-31 17:20:00
 * @Author: kenny half-giser@outlook.com
 * @Description: Unit tests for HMR functionality
 * @LastEditors: kenny half-giser@outlook.com
 * @LastEditTime: 2026-01-31 17:20:00
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
    createHotContext,
    applyUpdate,
    listHMRRecords,
    clearHMRRecords,
} from './hmr.ts'

describe('HMR Module', () => {
    beforeEach(() => {
        vi.restoreAllMocks()
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    describe('createHotContext', () => {
        it('should create a hot context for a module id', () => {
            const hot = createHotContext('test-module')

            expect(hot).toBeDefined()
            expect(typeof hot.accept).toBe('function')
            expect(typeof hot.dispose).toBe('function')
            expect(hot.data).toBeDefined()
        })

        it('should return the same data object for the same module id', () => {
            const hot1 = createHotContext('shared-module')
            const hot2 = createHotContext('shared-module')

            expect(hot1.data).toBe(hot2.data)
        })

        it('should register accept handler', () => {
            const hot = createHotContext('accept-test')
            const handler = vi.fn()

            hot.accept(handler)

            expect(listHMRRecords()).toContain('accept-test')
        })

        it('should register dispose handler', () => {
            const hot = createHotContext('dispose-test')
            const handler = vi.fn()

            hot.dispose(handler)

            expect(listHMRRecords()).toContain('dispose-test')
        })

        it('should allow multiple accept handlers for same module', () => {
            const hot = createHotContext('multi-accept')
            const handler1 = vi.fn()
            const handler2 = vi.fn()

            hot.accept(handler1)
            hot.accept(handler2)

            applyUpdate('multi-accept', { newModule: true })

            expect(handler1).toHaveBeenCalledWith({ newModule: true })
            expect(handler2).toHaveBeenCalledWith({ newModule: true })
        })

        it('should allow multiple dispose handlers for same module', () => {
            const hot = createHotContext('multi-dispose')
            const handler1 = vi.fn()
            const handler2 = vi.fn()

            hot.dispose(handler1)
            hot.dispose(handler2)

            applyUpdate('multi-dispose', { newModule: true })

            expect(handler1).toHaveBeenCalled()
            expect(handler2).toHaveBeenCalled()
        })
    })

    describe('applyUpdate', () => {
        it('should call all dispose handlers before accept handlers', async () => {
            const hot = createHotContext('order-test')
            const disposeHandler = vi.fn()
            const acceptHandler = vi.fn()

            hot.dispose(disposeHandler)
            hot.accept(acceptHandler)

            applyUpdate('order-test', { test: true })

            expect(disposeHandler).toHaveBeenCalledBefore(acceptHandler)
        })

        it('should pass data object to dispose handlers', () => {
            const hot = createHotContext('data-test')
            hot.data.testValue = 'initial'

            const disposeHandler = vi.fn((data: any) => {
                expect(data.testValue).toBe('initial')
            })

            hot.dispose(disposeHandler)
            applyUpdate('data-test', {})

            expect(disposeHandler).toHaveBeenCalled()
        })

        it('should pass new module to accept handlers', () => {
            const hot = createHotContext('module-test')
            const acceptHandler = vi.fn()

            hot.accept(acceptHandler)
            applyUpdate('module-test', { newModule: true })

            expect(acceptHandler).toHaveBeenCalledWith({ newModule: true })
        })

        it('should dispatch hmr:update custom event', () => {
            const hot = createHotContext('event-test')
            const eventHandler = vi.fn()

            hot.accept(eventHandler)

            const originalDispatchEvent = window.dispatchEvent
            const customEvents: CustomEvent[] = []
            window.dispatchEvent = vi.fn((event: Event) => {
                customEvents.push(event as CustomEvent)
                return true
            })

            applyUpdate('event-test', { updated: true })

            expect(customEvents.length).toBe(1)
            const event = customEvents[0]
            expect(event.type).toBe('hmr:update')
            expect(event.detail).toEqual({ id: 'event-test', module: { updated: true } })

            window.dispatchEvent = originalDispatchEvent
        })

        it('should not throw when no handlers registered', () => {
            expect(() => {
                applyUpdate('non-existent-module', {})
            }).not.toThrow()
        })

        it('should continue calling other handlers even if one throws', () => {
            const hot = createHotContext('error-test')
            const errorHandler = vi.fn(() => {
                throw new Error('Handler error')
            })
            const successHandler = vi.fn()

            hot.dispose(errorHandler)
            hot.dispose(successHandler)
            hot.accept(errorHandler)
            hot.accept(successHandler)

            applyUpdate('error-test', {})

            expect(errorHandler).toHaveBeenCalled()
            expect(successHandler).toHaveBeenCalledTimes(2)
        })

        it('should log errors from dispose handlers', () => {
            const hot = createHotContext('log-error-test')
            const errorHandler = vi.fn(() => {
                throw new Error('Dispose error')
            })

            hot.dispose(errorHandler)

            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

            applyUpdate('log-error-test', {})

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                '[HMR] dispose handler failed:',
                expect.any(Error)
            )

            consoleErrorSpy.mockRestore()
        })

        it('should log errors from accept handlers', () => {
            const hot = createHotContext('accept-error-test')
            const errorHandler = vi.fn(() => {
                throw new Error('Accept error')
            })

            hot.accept(errorHandler)

            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

            applyUpdate('accept-error-test', {})

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                '[HMR] accept handler failed:',
                expect.any(Error)
            )

            consoleErrorSpy.mockRestore()
        })
    })

    describe('listHMRRecords', () => {
        beforeEach(() => {
            clearHMRRecords()
        })

        it('should return empty array when no modules registered', () => {
            expect(listHMRRecords()).toEqual([])
        })

        it('should return all registered module ids', () => {
            createHotContext('module-a')
            createHotContext('module-b')
            createHotContext('module-c')

            const records = listHMRRecords()

            expect(records).toContain('module-a')
            expect(records).toContain('module-b')
            expect(records).toContain('module-c')
            expect(records.length).toBe(3)
        })
    })

    describe('data persistence', () => {
        it('should preserve data across module updates', () => {
            const hot = createHotContext('persistence-test')
            hot.data.counter = 0

            hot.data.counter += 1
            expect(hot.data.counter).toBe(1)

            const newHot = createHotContext('persistence-test')
            expect(newHot.data.counter).toBe(1)
        })

        it('should allow data modification in dispose handler', () => {
            const hot = createHotContext('data-modify-test')
            hot.data.state = 'old'

            hot.dispose((data) => {
                data.savedState = data.state
            })

            applyUpdate('data-modify-test', {})

            const newHot = createHotContext('data-modify-test')
            expect(newHot.data.savedState).toBe('old')
        })
    })

    describe('cross-module updates', () => {
        it('should allow modules to react to hmr:update events', () => {
            const hot = createHotContext('cross-module')
            const eventHandler = vi.fn()

            window.addEventListener('hmr:update', (e: any) => {
                if (e.detail?.id === 'other-module') {
                    eventHandler(e.detail)
                }
            })

            createHotContext('other-module')
            applyUpdate('other-module', { test: true })

            expect(eventHandler).toHaveBeenCalled()
            expect(eventHandler).toHaveBeenCalledWith(
                expect.objectContaining({
                    id: 'other-module',
                    module: { test: true },
                })
            )
        })
    })
})
