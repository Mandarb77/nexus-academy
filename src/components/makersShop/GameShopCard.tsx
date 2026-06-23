/*
 * Single catalog card in Supply — trading-post (legacy) or bench tile (compact grid).
 */

import { useState } from 'react'
import type { ShopCatalogItem, ShopLimitStatus } from '../../types/shopCatalog'
import { ShopAccordion } from './ShopAccordion'
import { ShopItemGlyph } from './ShopItemGlyph'
import { iconVariantForItemKey } from './shopDisplay'

type GameShopCardProps = {
  layout?: 'legacy' | 'bench'
  displayMode?: 'compact' | 'full' | 'strip'
  item: ShopCatalogItem
  shelfAccent: 'forge' | 'prism' | 'folded'
  catalogLocked: boolean
  limitStatus?: ShopLimitStatus | null
  canAfford: boolean
  canBuy: boolean
  busy: boolean
  traded: boolean
  toast?: { kind: 'success' | 'error'; message: string; detail?: string } | null
  specialtyFilamentTypes?: string[]
  onDismissToast: () => void
  isSupabaseConfigured: boolean
  catalogLoading: boolean
  onBuy: (item: ShopCatalogItem) => void
  gold?: number
  onRequestFilament?: (item: ShopCatalogItem, grams: number, calculatedGoldCost: number) => void
}

function PurchaseButton({
  layout,
  item,
  catalogLocked,
  limitStatus,
  canAfford,
  canBuy,
  busy,
  traded,
  isSupabaseConfigured,
  catalogLoading,
  onBuy,
}: Pick<
  GameShopCardProps,
  | 'layout'
  | 'item'
  | 'catalogLocked'
  | 'limitStatus'
  | 'canAfford'
  | 'canBuy'
  | 'busy'
  | 'traded'
  | 'isSupabaseConfigured'
  | 'catalogLoading'
  | 'onBuy'
>) {
  const bench = layout === 'bench'
  const limitBlocked = limitStatus?.allowed === false

  return (
    <div className={bench ? 'shop-item__actions' : 'makers-shop-card__actions'}>
      <button
        type="button"
        className={
          bench
            ? `btn-secondary shop-item__buy${canBuy ? ' shop-item__buy--ready' : ''}`
            : `makers-shop-buy${canBuy ? ' makers-shop-buy--hot' : ''}`
        }
        disabled={
          !isSupabaseConfigured || limitBlocked || (!catalogLocked && !canBuy) || busy || traded || catalogLoading
        }
        onClick={(event) => {
          event.stopPropagation()
          onBuy(item)
        }}
      >
        {traded ? (
          'TRADED'
        ) : busy ? (
          'Trading…'
        ) : catalogLocked ? (
          'ASK FRAN'
        ) : limitBlocked ? (
          'Unavailable'
        ) : canAfford ? (
          'Trade'
        ) : (
          'NOT YET, KID'
        )}
      </button>
    </div>
  )
}

function lockLabel(catalogLocked: boolean): string {
  if (!catalogLocked) return ''
  return 'ASK FRAN'
}

const LOCKED_GATE_NOTE = "Mr. Cook's call on this one. Talk to him."

function lockedGateNote(item: ShopCatalogItem): string {
  return item.gate_requirement?.trim() || LOCKED_GATE_NOTE
}

function stripInlineMarkers(text: string): string {
  return text.replace(/\*([^*]+)\*/g, '$1')
}

function itemTeaser(item: ShopCatalogItem): string {
  return stripInlineMarkers(item.description.split('\n').find((line) => line.trim())?.trim() ?? item.description)
}

function renderDescriptionParts(line: string) {
  return line.split(/(\*[^*]+\*)/g).map((part, index) => {
    if (part.startsWith('*') && part.endsWith('*')) {
      return (
        <span key={index} className="shop-item__handwritten">
          {part.slice(1, -1)}
        </span>
      )
    }
    return part
  })
}

function ShopItemDescription({ text, className }: { text: string; className: string }) {
  const lines = text.split('\n')
  return (
    <div className={className}>
      {lines.map((line, index) =>
        line.trim() ? (
          <p key={index} className="shop-item__desc-line">
            {renderDescriptionParts(line)}
          </p>
        ) : null,
      )}
    </div>
  )
}

/*
 * Render purchase feedback inside the purchased card instead of as a global toast.
 * Students were missing top-of-page messages, so the confirmation now appears in
 * the same visual spot as the Trade button they just clicked.
 */
function ShopItemToast({
  toast,
  onDismissToast,
}: {
  toast?: { kind: 'success' | 'error'; message: string; detail?: string } | null
  onDismissToast: () => void
}) {
  if (!toast) return null
  return (
    <button
      type="button"
      className={`shop-toast shop-toast--${toast.kind}`}
      role={toast.kind === 'error' ? 'alert' : 'status'}
      onClick={(event) => {
        event.stopPropagation()
        onDismissToast()
      }}
      aria-label="Dismiss notification"
    >
      <p className="shop-toast__message">{toast.message}</p>
      {toast.detail ? <p className="shop-toast__detail">{toast.detail}</p> : null}
      <span className="shop-toast__dismiss">Click to dismiss</span>
    </button>
  )
}

function LimitMessages({
  className,
  limitStatus,
  catalogLocked,
}: {
  className: string
  limitStatus?: ShopLimitStatus | null
  catalogLocked: boolean
}) {
  if (catalogLocked && limitStatus?.allowed !== false) return null
  const lines = limitStatus?.allowed === false
    ? [limitStatus.disabled_message || 'This trade is unavailable right now.']
    : limitStatus?.messages ?? []
  if (!lines.length) return null
  return (
    <>
      {lines.map((line) => (
        <p key={line} className={className}>
          {line}
        </p>
      ))}
    </>
  )
}

function specialtyFilamentOptions(item: ShopCatalogItem): string[] {
  return (item.flavor_text ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

function SpecialtyFilamentCalculator({
  item,
  gold,
  busy,
  catalogLoading,
  specialtyFilamentTypes = [],
  onRequestFilament,
}: {
  item: ShopCatalogItem
  gold: number
  busy: boolean
  catalogLoading: boolean
  specialtyFilamentTypes?: string[]
  onRequestFilament?: (item: ShopCatalogItem, grams: number, calculatedGoldCost: number) => void
}) {
  const [gramsInput, setGramsInput] = useState('')
  const grams = Number.parseInt(gramsInput, 10)
  const validGrams = Number.isFinite(grams) && grams > 0 ? grams : 0
  const calculatedCost = validGrams > 0 ? 10 + Math.ceil(validGrams / 25) : 0
  const canRequest = validGrams > 0 && gold >= calculatedCost && !busy && !catalogLoading
  const options = specialtyFilamentTypes.length > 0 ? specialtyFilamentTypes : specialtyFilamentOptions(item)

  return (
    <div className="shop-filament-calculator">
      <p className="shop-filament-calculator__note">
        Standard filament is free for quest and gift work. Pull it from the shelf. For personal projects,
        use your Personal Project Pass.
      </p>
      <p className="shop-filament-calculator__note">
        Open your file in Bambu Studio, slice it, and check the filament panel on the right. Find the grams
        used for each specialty color and add them together.
      </p>
      {options.length > 0 ? (
        <div className="shop-filament-calculator__types">
          <strong>Specialty filament includes:</strong>
          <ul>
            {options.map((option) => (
              <li key={option}>{option}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <label className="shop-filament-calculator__field">
        <span>Specialty grams used</span>
        <input
          type="number"
          inputMode="numeric"
          min={1}
          step={1}
          value={gramsInput}
          onChange={(event) => setGramsInput(event.target.value.replace(/[^\d]/g, ''))}
          placeholder="e.g. 100"
        />
      </label>
      <p className="shop-filament-calculator__formula">10 gold base + 1 gold per 25g (rounded up)</p>
      <p className="shop-filament-calculator__cost">
        {validGrams > 0 ? `${calculatedCost} gold` : 'Enter grams to calculate cost'}
      </p>
      {validGrams > 0 && gold < calculatedCost ? (
        <p className="shop-filament-calculator__warning">Not enough gold for this request.</p>
      ) : null}
      <button
        type="button"
        className="btn-secondary shop-filament-calculator__button"
        disabled={!canRequest}
        onClick={(event) => {
          event.stopPropagation()
          if (canRequest) onRequestFilament?.(item, validGrams, calculatedCost)
        }}
      >
        {busy ? 'Requesting…' : 'Request this purchase'}
      </button>
    </div>
  )
}

function BenchShopCard(props: GameShopCardProps) {
  const {
    displayMode = 'compact',
    item,
    shelfAccent,
    catalogLocked,
    limitStatus,
    canAfford,
    canBuy,
    busy,
    traded,
    toast,
    specialtyFilamentTypes,
    onDismissToast,
    isSupabaseConfigured,
    catalogLoading,
    onBuy,
    gold = 0,
    onRequestFilament,
  } = props
  const price = item.price_gold
  const variant = catalogLocked ? 'mystery' : iconVariantForItemKey(item.item_key)
  const full = displayMode === 'full'
  const strip = displayMode === 'strip'
  const hasFlavor = full && !catalogLocked && Boolean(item.flavor_text?.trim())
  const teaser = itemTeaser(item)
  const isSpecialtyFilament = item.item_key === 'specialty_filament_voucher'

  const purchaseProps = {
    layout: 'bench' as const,
    item,
    catalogLocked,
    limitStatus,
    canAfford,
    canBuy,
    busy,
    traded,
    isSupabaseConfigured,
    catalogLoading,
    onBuy,
  }

  return (
    <li
      className={`shop-item card shop-item--${shelfAccent}${
        catalogLocked ? ' shop-item--locked' : ''
      }${canBuy ? ' shop-item--ready' : ''}${full ? ' shop-item--expanded' : ''}${
        strip ? ' shop-item--strip' : ''
      }`}
    >
      <ShopItemToast toast={toast} onDismissToast={onDismissToast} />
      <div className="shop-item__head">
        <div className="shop-item__glyph-wrap" aria-hidden>
          <ShopItemGlyph variant={variant} className="shop-item-glyph" />
        </div>
        <div className="shop-item__main">
          <h3 className="shop-item__title">{item.name}</h3>
          {!strip && !full ? <p className="shop-item__teaser muted">{teaser}</p> : null}
          {hasFlavor ? (
            <p className="shop-item__flavor muted">
              <em>{item.flavor_text}</em>
            </p>
          ) : null}
        </div>
      </div>
      <div className="shop-item__details" aria-hidden={!full}>
        <ShopItemDescription text={item.description} className="shop-item__desc muted" />
      </div>
      <div className="shop-item__foot">
        {isSpecialtyFilament ? (
          <span className="shop-item__price shop-item__price--locked">Calculated</span>
        ) : catalogLocked && price == null ? (
          <span className="shop-item__price shop-item__price--locked">{lockLabel(true)}</span>
        ) : (
          <span className="shop-item__price">
            <span className="shop-item__price-value">{price}</span>{' '}
            <span className="gold-currency-text">gold</span>
          </span>
        )}
        {!isSpecialtyFilament ? <PurchaseButton {...purchaseProps} /> : null}
      </div>
      {isSpecialtyFilament ? (
        <SpecialtyFilamentCalculator
          item={item}
          gold={gold}
          busy={busy}
          catalogLoading={catalogLoading}
          specialtyFilamentTypes={specialtyFilamentTypes}
          onRequestFilament={onRequestFilament}
        />
      ) : null}
      {catalogLocked && !strip ? (
        <p className="shop-item__note shop-item__note--locked muted">{lockedGateNote(item)}</p>
      ) : null}
      <LimitMessages className="shop-item__note shop-item__note--limit muted" limitStatus={limitStatus} catalogLocked={catalogLocked} />
    </li>
  )
}

function LegacyShopCard(props: GameShopCardProps) {
  const {
    displayMode = 'compact',
    item,
    shelfAccent,
    catalogLocked,
    limitStatus,
    canAfford,
    canBuy,
    busy,
    traded,
    toast,
    onDismissToast,
    isSupabaseConfigured,
    catalogLoading,
    onBuy,
  } = props
  const price = item.price_gold
  const variant = catalogLocked ? 'mystery' : iconVariantForItemKey(item.item_key)
  const limitBlocked = limitStatus?.allowed === false
  const purchaseBlocked = !catalogLocked && price != null && (!canAfford || limitBlocked)
  const full = displayMode === 'full'
  const strip = displayMode === 'strip'
  const hasFlavor = full && !catalogLocked && Boolean(item.flavor_text?.trim())
  const teaser = itemTeaser(item)

  const cardMods = [
    'makers-shop-card',
    `makers-shop-card--accent-${shelfAccent}`,
    catalogLocked ? 'makers-shop-card--mystery' : '',
    purchaseBlocked ? 'makers-shop-card--soft-lock' : '',
    canBuy ? 'makers-shop-card--ready' : '',
    full ? 'makers-shop-card--expanded' : '',
    strip ? 'makers-shop-card--strip' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const titleMods = [
    'makers-shop-card__title',
    catalogLocked ? 'makers-shop-card__title--mystery' : '',
    canBuy ? 'makers-shop-card__title--ready' : '',
    !catalogLocked && !canBuy && !canAfford ? 'makers-shop-card__title--low' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const purchaseProps = {
    layout: 'legacy' as const,
    item,
    catalogLocked,
    limitStatus,
    canAfford,
    canBuy,
    busy,
    traded,
    isSupabaseConfigured,
    catalogLoading,
    onBuy,
  }

  return (
    <li className={cardMods}>
      <div className="makers-shop-card__frame">
        <ShopItemToast toast={toast} onDismissToast={onDismissToast} />
        <div className="makers-shop-card__rail" aria-hidden />
        <h3 className={titleMods}>{item.name}</h3>
        {!strip && !full ? <p className="makers-shop-card__teaser">{teaser}</p> : null}
        <div className="makers-shop-card__details" aria-hidden={!full}>
          <ShopItemDescription text={item.description} className="makers-shop-card__desc" />
        </div>

        <div className="makers-shop-card__summary">
          <div className="makers-shop-card__icon-row" aria-hidden="true">
            <div className="makers-shop-card__icon-wrap">
              <ShopItemGlyph variant={variant} />
            </div>
          </div>

          <div className="makers-shop-card__price-row" aria-live="polite">
            {catalogLocked && price == null ? (
              <span className="makers-shop-card__price makers-shop-card__price--locked">
                {lockLabel(true)}
              </span>
            ) : (
              <>
                <span className="makers-shop-card__coin" aria-hidden />
                <span className="makers-shop-card__price">{price}</span>
                <span className="makers-shop-card__price-unit">gold</span>
              </>
            )}
          </div>

          {catalogLocked && !strip ? (
            <p className="makers-shop-card__inline-note makers-shop-card__inline-note--locked">
              {lockedGateNote(item)}
            </p>
          ) : null}
          <LimitMessages className="makers-shop-card__inline-note makers-shop-card__inline-note--limit" limitStatus={limitStatus} catalogLocked={catalogLocked} />
        </div>

        {hasFlavor ? (
          <div onClick={(event) => event.stopPropagation()}>
            <ShopAccordion
              title="Lore & trade"
              icon={<span className="makers-shop-mini-dot" aria-hidden />}
              className="makers-shop-card__accordion"
              defaultOpen={false}
            >
              <div className="makers-shop-card__purchase-panel">
                <p className="makers-shop-card__flavor">
                  <em>{item.flavor_text}</em>
                </p>
                <PurchaseButton {...purchaseProps} />
              </div>
            </ShopAccordion>
          </div>
        ) : (
          <PurchaseButton {...purchaseProps} />
        )}
      </div>
    </li>
  )
}

export function GameShopCard(props: GameShopCardProps) {
  if (props.layout === 'bench') return <BenchShopCard {...props} />
  return <LegacyShopCard {...props} />
}
