import { useEffect, useState, type ReactNode } from "react"
import {
  CheckIcon,
  CreditCardIcon,
  MessageCircleIcon,
  RulerIcon,
  ShoppingCartIcon,
  TrophyIcon,
  TruckIcon,
  type LucideIcon,
} from "lucide-react"
import { toast } from "sonner"

import { IconBadge } from "@/components/icon-badge"
import { PageHeader } from "@/components/page-header"
import { CatalogList } from "@/components/settings/catalog-list"
import { MessengerLinkCard } from "@/components/settings/messenger-link-card"
import { ShippingRatesCard } from "@/components/settings/shipping-rates-card"
import { IncentiveTierList } from "@/components/settings/incentive-tier-list"
import { QuickSizesCard } from "@/components/settings/quick-sizes-card"
import { Button } from "@/components/ui/button"
import { CurrencyInput } from "@/components/ui/currency-input"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { useIncentiveTierActions, useIncentiveTiers } from "@/lib/incentive-tiers"
import { useOrderChannelActions, useOrderChannels } from "@/lib/order-channels"
import { usePaymentMethodActions, usePaymentMethods } from "@/lib/payment-methods"
import { useSettings, useSettingsActions } from "@/lib/settings"

const SAVED_FLASH_MS = 2000

const SECTIONS = [
  { id: "payment-methods", label: "Payment methods" },
  { id: "order-channels", label: "Order channels" },
  { id: "bonus-tiers", label: "Bonus tiers" },
  { id: "shipping", label: "Shipping" },
  { id: "online-shop", label: "Online shop" },
  { id: "quick-sizes", label: "Quick sizes" },
] as const

/** One settings group: heading + description on the left (sticky on wide screens), the controls on
 * the right — the standard two-column settings layout, stacking on mobile. */
function SettingsSection({
  id,
  icon,
  title,
  description,
  children,
}: {
  id: string
  icon: LucideIcon
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="grid scroll-mt-20 grid-cols-1 gap-4 border-t pt-6 first:border-t-0 first:pt-0 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-8"
    >
      <div className="flex items-start gap-3 lg:sticky lg:top-20 lg:self-start">
        <IconBadge icon={icon} size="sm" />
        <div className="flex min-w-0 flex-col gap-1">
          <h2 id={`${id}-title`} className="text-base leading-snug font-semibold">
            {title}
          </h2>
          <p className="text-sm text-pretty text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  )
}

export function SettingsPage() {
  const { paymentMethods, isLoading: methodsLoading } = usePaymentMethods()
  const {
    addPaymentMethod,
    renamePaymentMethod,
    togglePaymentMethod,
    deletePaymentMethod,
    reorderPaymentMethods,
  } = usePaymentMethodActions()

  const { orderChannels, isLoading: channelsLoading } = useOrderChannels()
  const {
    addOrderChannel,
    renameOrderChannel,
    toggleOrderChannel,
    deleteOrderChannel,
    reorderOrderChannels,
  } = useOrderChannelActions()

  const { tiers, isLoading: tiersLoading } = useIncentiveTiers()
  const { addIncentiveTier, updateIncentiveTier, deleteIncentiveTier } = useIncentiveTierActions()

  const { settings, isLoading: settingsLoading } = useSettings()
  const { updateSettings } = useSettingsActions()
  const [shippingFeeDraft, setShippingFeeDraft] = useState(() => String(settings.shippingFee))
  const [isSavingFee, setIsSavingFee] = useState(false)
  const [justSaved, setJustSaved] = useState(false)

  useEffect(() => {
    setShippingFeeDraft(String(settings.shippingFee))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.updatedAt])

  // Hide the "Saved" confirmation again after a moment.
  useEffect(() => {
    if (!justSaved) return
    const timer = window.setTimeout(() => setJustSaved(false), SAVED_FLASH_MS)
    return () => window.clearTimeout(timer)
  }, [justSaved])

  const feeDirty = (Number(shippingFeeDraft) || 0) !== settings.shippingFee

  async function handleSaveFee() {
    if (!feeDirty || isSavingFee) return
    setIsSavingFee(true)
    try {
      await updateSettings({ shippingFee: Math.max(0, Number(shippingFeeDraft) || 0) })
      setJustSaved(true)
      toast.success("Shipping fee updated.")
    } catch (err) {
      toast.error(typeof err === "string" ? err : "Failed to update shipping fee.")
    } finally {
      setIsSavingFee(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="App settings" description="What staff can pick when creating and managing orders." />

      <nav aria-label="Settings sections" className="-mt-2 hidden flex-wrap gap-1 lg:flex">
        {SECTIONS.map((section) => (
          <a
            key={section.id}
            href={`#${section.id}`}
            className="rounded-md px-2.5 py-1 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            {section.label}
          </a>
        ))}
      </nav>

      <div className="flex flex-col gap-6">
        <SettingsSection
          id="payment-methods"
          icon={CreditCardIcon}
          title="Payment methods"
          description="Methods staff can choose when recording a payment."
        >
          <CatalogList
            items={paymentMethods}
            isLoading={methodsLoading}
            noun="payment methods"
            addPlaceholder="Add a payment method…"
            onAdd={addPaymentMethod}
            onRename={renamePaymentMethod}
            onToggle={togglePaymentMethod}
            onDelete={deletePaymentMethod}
            onReorder={reorderPaymentMethods}
          />
        </SettingsSection>

        <SettingsSection
          id="order-channels"
          icon={ShoppingCartIcon}
          title="Order channels"
          description="Where an order came from, e.g. Walk-in or Facebook."
        >
          <CatalogList
            items={orderChannels}
            isLoading={channelsLoading}
            noun="channels"
            addPlaceholder="Add a channel…"
            onAdd={addOrderChannel}
            onRename={renameOrderChannel}
            onToggle={toggleOrderChannel}
            onDelete={deleteOrderChannel}
            onReorder={reorderOrderChannels}
          />
        </SettingsSection>

        <SettingsSection
          id="bonus-tiers"
          icon={TrophyIcon}
          title="Sales-target bonus"
          description="Monthly team sales thresholds and the pool each one unlocks. Changes apply to this month and any unreleased past months."
        >
          <IncentiveTierList
            tiers={tiers}
            isLoading={tiersLoading}
            onAdd={addIncentiveTier}
            onUpdate={updateIncentiveTier}
            onDelete={deleteIncentiveTier}
          />
        </SettingsSection>

        <SettingsSection
          id="shipping"
          icon={TruckIcon}
          title="Shipping"
          description="Default fee added to new orders."
        >
          <div className="rounded-xl border bg-card p-4 shadow-[var(--shadow-soft)]">
            <Field>
              <FieldLabel htmlFor="settings-shipping-fee">Shipping fee</FieldLabel>
              <div className="flex flex-wrap items-center gap-2">
                <CurrencyInput
                  id="settings-shipping-fee"
                  wrapperClassName="w-40"
                  className="h-8 tabular-nums"
                  value={shippingFeeDraft}
                  disabled={settingsLoading}
                  onChange={(event) => setShippingFeeDraft(event.target.value)}
                  onKeyDown={(event) => event.key === "Enter" && handleSaveFee()}
                />
                <Button size="sm" onClick={handleSaveFee} disabled={!feeDirty || isSavingFee || settingsLoading}>
                  {isSavingFee && <Spinner data-icon="inline-start" />}
                  Save
                </Button>
                {feeDirty && !isSavingFee ? (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShippingFeeDraft(String(settings.shippingFee))}
                    >
                      Reset
                    </Button>
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span aria-hidden className="size-2 rounded-full bg-order-status-gold" />
                      Unsaved change
                    </span>
                  </>
                ) : justSaved ? (
                  <span
                    role="status"
                    className="flex animate-in items-center gap-1 text-xs font-medium text-order-status-teal duration-200 fade-in-0 motion-reduce:animate-none"
                  >
                    <CheckIcon aria-hidden className="size-3.5 stroke-3" />
                    Saved
                  </span>
                ) : null}
              </div>
              <FieldDescription>Prefills the order form's shipping fee. Staff can still change it per order.</FieldDescription>
            </Field>
          </div>
        </SettingsSection>

        <SettingsSection
          id="online-shop"
          icon={MessageCircleIcon}
          title="Online shop"
          description="Checkout shipping fees and how buyers reach you."
        >
          <div className="flex flex-col gap-4">
            <ShippingRatesCard />
            <MessengerLinkCard />
          </div>
        </SettingsSection>

        <SettingsSection
          id="quick-sizes"
          icon={RulerIcon}
          title="Quick sizes"
          description="Preset sizes staff can tap on the Calculator."
        >
          <QuickSizesCard />
        </SettingsSection>
      </div>
    </div>
  )
}
