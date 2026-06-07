import { useCallback, useEffect, useState } from 'react'
import {
  groupResourcesByGuild,
  LEARN_TOOL_GUILDS,
  LEARN_TOOL_GUILD_HEADINGS,
  normalizeLearnToolRow,
} from '../../lib/learnToolResources'
import { isSupabaseConfigured, supabase } from '../../lib/supabase'
import type { LearnToolResourceRow } from '../../types/learnToolResource'
import { LearnToolLink } from './LearnToolLink'
import { ToolResourceProposalForm } from './ToolResourceProposalForm'

type Props = {
  sectionId?: string
}

const GUILD_HEADING_MOD: Record<string, string> = {
  Forge: 'forge',
  Void: 'void',
  Prism: 'prism',
  Silicon: 'silicon',
  Folded: 'folded',
}

export function LearnToolsSection({ sectionId = 'field-guide-learn' }: Props) {
  const [resources, setResources] = useState<LearnToolResourceRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadResources = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setLoading(false)
      return
    }
    setLoading(true)
    const { data, error: loadErr } = await supabase
      .from('learn_tool_resources')
      .select('id, guild, title, description, url, credit_line, status, submitted_by, sort_order')
      .eq('status', 'approved')
      .order('guild', { ascending: true })
      .order('sort_order', { ascending: true })
      .order('title', { ascending: true })
    setLoading(false)
    if (loadErr) {
      setError(loadErr.message)
      return
    }
    setError(null)
    setResources((data ?? []).map((r) => normalizeLearnToolRow(r as Record<string, unknown>)))
  }, [])

  useEffect(() => {
    void loadResources()
  }, [loadResources])

  const byGuild = groupResourcesByGuild(resources)

  return (
    <section
      id={sectionId}
      className="learn-tools-section field-guide-scroll-target field-guide-panel"
      aria-labelledby="learn-tools-heading"
    >
      <header className="learn-tools-section__header">
        <h2 id="learn-tools-heading" className="learn-tools-section__title">
          Learn the Tools
        </h2>
      </header>

      {loading ? (
        <p className="muted">Loading resources…</p>
      ) : error ? (
        <p className="error" role="alert">{error}</p>
      ) : (
        LEARN_TOOL_GUILDS.map((guild) => {
          const links = byGuild.get(guild) ?? []
          if (!links.length) return null
          return (
            <div key={guild} className="learn-tools-guild">
              <h3
                className={`learn-tools-guild__heading learn-tools-guild__heading--${GUILD_HEADING_MOD[guild] ?? 'default'}`}
              >
                {LEARN_TOOL_GUILD_HEADINGS[guild]}
              </h3>
              <ul className="learn-tools-list">
                {links.map((resource) => (
                  <LearnToolLink key={resource.id} resource={resource} />
                ))}
              </ul>
            </div>
          )
        })
      )}

      <div className="learn-tools-student">
        <h3 className="learn-tools-student__heading">Student-contributed resources</h3>
        <p className="muted learn-tools-student__lead">
          Found something worth sharing? Submit a link for your guild — your teacher approves before it goes live.
        </p>
        <ToolResourceProposalForm onSubmitted={() => void loadResources()} />
      </div>
    </section>
  )
}
