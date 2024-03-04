import { type DOMWindow, JSDOM } from 'jsdom'
import { equal } from 'node:assert'
import { test } from 'node:test'

import type { HotkeyOverride } from '../index.js'
import { hotkeyKeyUX, startKeyUX } from '../index.js'

function press(
  window: DOMWindow,
  data: Partial<Omit<KeyboardEventInit, 'view'>>,
  target: EventTarget = window
): void {
  let down = new window.KeyboardEvent('keydown', { ...data, bubbles: true })
  target.dispatchEvent(down)
  let up = new window.KeyboardEvent('keyup', { ...data, bubbles: true })
  target.dispatchEvent(up)
}

test('adds hot keys to buttons and links', () => {
  let window = new JSDOM().window
  startKeyUX(window, [hotkeyKeyUX()])
  window.document.body.innerHTML =
    '<button aria-keyshortcuts="b">1</button>' +
    '<button aria-keyshortcuts="Ctrl+B">10</button>' +
    '<button aria-keyshortcuts="plus">100</button>' +
    '<a href="#" aria-keyshortcuts="meta+ctrl+alt+shift+b">1000</a>'

  let result = 0
  let buttons = window.document.querySelectorAll('button, a')
  for (let button of buttons) {
    button.addEventListener('click', () => {
      result += parseInt(button.textContent!)
    })
  }

  press(window, { key: 'b' })
  equal(result, 1)

  press(window, { altKey: true, key: 'b' })
  equal(result, 1)

  press(window, { key: 'b' })
  equal(result, 2)

  press(window, { ctrlKey: true, key: 'b' })
  equal(result, 12)

  press(window, { key: '+' })
  equal(result, 112)

  press(window, {
    altKey: true,
    ctrlKey: true,
    key: 'b',
    metaKey: true,
    shiftKey: true
  })
  equal(result, 1112)
})

test('stops event tracking', () => {
  let window = new JSDOM().window
  let stop = startKeyUX(window, [hotkeyKeyUX()])
  window.document.body.innerHTML = '<button aria-keyshortcuts="b"></button>'

  let clicked = 0
  window.document.querySelector('button')!.addEventListener('click', () => {
    clicked += 1
  })

  press(window, { key: 'b' })
  equal(clicked, 1)

  stop()
  press(window, { key: 'b' })
  equal(clicked, 1)

  startKeyUX(window, [hotkeyKeyUX()])
  press(window, { key: 'b' })
  equal(clicked, 2)
})

test('ignores hot keys when focus is inside text fields', () => {
  let window = new JSDOM().window
  startKeyUX(window, [hotkeyKeyUX()])
  window.document.body.innerHTML =
    '<input type="text">' +
    '<input type="radio">' +
    '<textarea></textarea>' +
    '<a></a>' +
    '<button aria-keyshortcuts="b"></button>'

  let clicked = 0
  window.document.querySelector('button')!.addEventListener('click', () => {
    clicked += 1
  })

  press(window, { key: 'b' }, window.document.querySelector('[type=text]')!)
  equal(clicked, 0)

  press(window, { key: 'b' }, window.document.querySelector('textarea')!)
  equal(clicked, 0)

  press(window, { key: 'b' }, window.document.querySelector('a')!)
  equal(clicked, 1)

  press(window, { key: 'b' }, window.document.querySelector('[type=radio]')!)
  equal(clicked, 2)
})

test('supports non-English keyboard layouts', () => {
  let window = new JSDOM().window
  startKeyUX(window, [hotkeyKeyUX()])
  window.document.body.innerHTML = '<button aria-keyshortcuts="Alt+B"></button>'

  let clicked = 0
  window.document.querySelector('button')!.addEventListener('click', () => {
    clicked += 1
  })

  press(window, { altKey: true, code: 'KeyB', key: 'и' })
  equal(clicked, 1)
})

test('allows to override hotkeys', () => {
  let window = new JSDOM().window
  let overrides: HotkeyOverride = {}
  startKeyUX(window, [hotkeyKeyUX(overrides)])
  window.document.body.innerHTML =
    '<button aria-keyshortcuts="b"></button>' +
    '<button aria-keyshortcuts="q"></button>'

  let clicked = ''
  for (let button of window.document.querySelectorAll('button')) {
    button.addEventListener('click', () => {
      clicked += button.getAttribute('aria-keyshortcuts')!
    })
  }

  overrides.q = 'b'
  overrides.a = 'q'
  press(window, { key: 'b' })
  equal(clicked, '')

  press(window, { key: 'q' })
  equal(clicked, 'b')

  press(window, { key: 'a' })
  equal(clicked, 'bq')

  press(window, { code: 'KeyQ', key: 'й' })
  equal(clicked, 'bqb')
})

test('should ignore data-keyux-ignore-hotkeys element and call after focus on it', () => {
  let window = new JSDOM().window
  startKeyUX(window, [hotkeyKeyUX()])
  window.document.body.innerHTML =
    '<ul>' +
    '<li tabindex="0" data-keyux-ignore-hotkeys>' +
    '<button aria-keyshortcuts="v">v1</button>' +
    '</li>' +
    '<li>' +
    '<button aria-keyshortcuts="v">v2</button>' +
    '</li>' +
    '</ul>'

  let clicked = ''
  for (let button of window.document.querySelectorAll('button')) {
    button.addEventListener('click', () => {
      clicked += button.textContent
    })
  }

  press(window, { key: 'v' })
  equal(clicked, 'v2')
  ;(window.document.querySelector('ul li') as HTMLLIElement).focus()

  press(window, { key: 'v' })
  equal(clicked, 'v2v1')
})

test('should call element with "data-keyux-hotkeys" outside a container', () => {
  let window = new JSDOM().window
  startKeyUX(window, [hotkeyKeyUX()])
  window.document.body.innerHTML =
    '<ul>' +
    '<li tabindex="0" data-keyux-hotkeys="click-on-third" data-keyux-ignore-hotkeys>' +
    '<button aria-keyshortcuts="v">First button</button>' +
    '</li>' +
    '<li tabindex="0" data-keyux-ignore-hotkeys>' +
    '<button aria-keyshortcuts="v">Second button </button>' +
    '</li>' +
    '</ul>' +
    '<div data-keyux-ignore-hotkeys tabindex="0">' +
    '<button aria-keyshortcuts="v" id="click-on-third">Third button </button>' +
    '</div>'

  let clicked = ''
  for (let button of window.document.querySelectorAll('button')) {
    button.addEventListener('click', () => {
      clicked += button.textContent
    })
  }

  press(window, { key: 'v' })
  equal(clicked, '')

  window.document.querySelectorAll('li')[0].focus()

  press(window, { key: 'v' })
  equal(clicked, 'Third button ')

  window.document.querySelectorAll('li')[1].focus()

  press(window, { key: 'v' })
  equal(clicked, 'Third button Second button ')

  window.document.querySelector('div')?.focus()

  press(window, { key: 'v' })
  equal(clicked, 'Third button Second button Third button ')
})

test('should support clicking on global element which occured before focused without ignore attr', () => {
  let window = new JSDOM().window
  startKeyUX(window, [hotkeyKeyUX()])
  window.document.body.innerHTML =
    '<ul>' +
    '<li tabindex="0" data-keyux-ignore-hotkeys>' +
    '<button aria-keyshortcuts="v">First button</button>' +
    '</li>' +
    '</ul>' +
    '<button aria-keyshortcuts="v">Second button </button>' +
    '<button>Focus element</button>'

  let clicked = ''
  for (let button of window.document.querySelectorAll('button')) {
    button.addEventListener('click', () => {
      clicked += button.textContent
    })
  }

  press(window, { key: 'v' })
  equal(clicked, 'Second button ')

  window.document.querySelectorAll('button')[1].focus()

  press(window, { key: 'v' })
  equal(clicked, 'Second button Second button ')

  window.document.querySelectorAll('button')[2].focus()

  press(window, { key: 'v' })
  equal(clicked, 'Second button Second button Second button ')
})

test('should call element in "data-keyux-hotkeys" container', () => {
  let window = new JSDOM().window
  startKeyUX(window, [hotkeyKeyUX()])
  window.document.body.innerHTML =
    '<ul>' +
    '<li tabindex="0" data-keyux-hotkeys="panel" data-keyux-ignore-hotkeys>' +
    '<button aria-keyshortcuts="v">First button</button>' +
    '</li>' +
    '</ul>' +
    '<div id="panel" data-keyux-ignore-hotkeys>' +
    '<button aria-keyshortcuts="v">Panel button </button>' +
    '</div>'

  let clicked = ''
  for (let button of window.document.querySelectorAll('button')) {
    button.addEventListener('click', () => {
      clicked += button.textContent
    })
  }

  press(window, { key: 'v' })
  equal(clicked, '')

  window.document.querySelectorAll('li')[0].focus()

  press(window, { key: 'v' })
  equal(clicked, 'Panel button ')

  window.document.querySelectorAll('button')[0].focus()

  press(window, { key: 'v' })
  equal(clicked, 'Panel button First button')
})
