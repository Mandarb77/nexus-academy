/*
 * SIGNAL lesson renderer — **bold**, `code`, *italic*, numbered and bullet lists.
 * Builds React nodes only; never injects HTML from the database.
 */

import { type ReactNode } from 'react'
import { SILICON_SIGNAL_PAGE_COPY, SILICON_SIGNAL_TAB_TITLES } from '../lib/siliconSignalLesson'

type Block =
  | { type: 'h'; text: string }
  | { type: 'p'; text: string }
  | { type: 'ol'; items: string[] }
  | { type: 'ul'; items: string[] }

const HEADING_ONLY = /^\*\*([^*]+)\*\*$/
const ORDERED = /^(\d+)\.\s+(.*)$/
const BULLET = /^[-•]\s+(.*)$/

function parseInline(text: string, keyPrefix: string): ReactNode[] {
  const re = /(\*\*[^*]+?\*\*|`[^`]+?`|\*[^*]+?\*)/g
  const out: ReactNode[] = []
  let last = 0
  let n = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index))
    const tok = m[0]
    const k = `${keyPrefix}-${n++}`
    if (tok.startsWith('**')) out.push(<strong key={k}>{tok.slice(2, -2)}</strong>)
    else if (tok.startsWith('`')) out.push(<code key={k}>{tok.slice(1, -1)}</code>)
    else out.push(<em key={k}>{tok.slice(1, -1)}</em>)
    last = m.index + tok.length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

export function parseSiliconSignalLesson(src: string): Block[] {
  const lines = src.replace(/\r\n/g, '\n').split('\n')
  const blocks: Block[] = []
  let para: string[] = []
  let list: { type: 'ol' | 'ul'; items: string[] } | null = null

  const flushPara = () => {
    if (para.length === 0) return
    blocks.push({ type: 'p', text: para.join(' ') })
    para = []
  }
  const flushList = () => {
    if (!list) return
    blocks.push({ type: list.type, items: list.items })
    list = null
  }

  for (const raw of lines) {
    const trimmed = raw.trim()
    if (!trimmed) {
      flushPara()
      flushList()
      continue
    }
    const heading = trimmed.match(HEADING_ONLY)
    if (heading) {
      flushPara()
      flushList()
      blocks.push({ type: 'h', text: heading[1] })
      continue
    }
    const ol = trimmed.match(ORDERED)
    if (ol) {
      flushPara()
      if (list?.type !== 'ol') {
        flushList()
        list = { type: 'ol', items: [] }
      }
      list.items.push(ol[2])
      continue
    }
    const ul = trimmed.match(BULLET)
    if (ul) {
      flushPara()
      if (list?.type !== 'ul') {
        flushList()
        list = { type: 'ul', items: [] }
      }
      list.items.push(ul[1])
      continue
    }
    flushList()
    para.push(trimmed)
  }
  flushPara()
  flushList()
  return blocks
}

export function SiliconSignalLessonBody({ page }: { page: 1 | 2 | 3 }) {
  const blocks = parseSiliconSignalLesson(SILICON_SIGNAL_PAGE_COPY[page])
  return (
    <div className="signal-lesson">
      <h2 className="signal-lesson-title">{SILICON_SIGNAL_TAB_TITLES[page]}</h2>
      {blocks.map((block, i) => {
        if (block.type === 'h') {
          return (
            <h3 key={i} className="signal-lesson-h">
              {block.text}
            </h3>
          )
        }
        if (block.type === 'p') {
          return (
            <p key={i} className="signal-lesson-p">
              {parseInline(block.text, `p${i}`)}
            </p>
          )
        }
        if (block.type === 'ol') {
          return (
            <ol key={i} className="signal-lesson-ol">
              {block.items.map((item, j) => (
                <li key={j}>{parseInline(item, `ol${i}-${j}`)}</li>
              ))}
            </ol>
          )
        }
        return (
          <ul key={i} className="signal-lesson-ul">
            {block.items.map((item, j) => (
              <li key={j}>{parseInline(item, `ul${i}-${j}`)}</li>
            ))}
          </ul>
        )
      })}
    </div>
  )
}
