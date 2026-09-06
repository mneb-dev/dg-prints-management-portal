import { useEffect, useState } from "react"
import { CreditCardIcon, ShoppingCartIcon, TruckIcon } from "lucide-react"
import { toast } from "sonner"

import { PageHeader } from "@/components/page-header"
import { CatalogList } from "@/components/settings/catalog-list"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CurrencyInput } from "@/components/ui/currency-input"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { useOrderChannelActions, useOrderChannels } from "@/lib/order-channels"
import { usePaymentMethodActions, usePaymentMethods } from "@/lib/payment-methods"
import { useSettings, useSettingsActions } from "@/lib/settings"

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

  const { settings, isLoading: settingsLoading } = useSettings()
  const { updateSettings } = useSettingsActions()
  const [shippingFeeDraft, setShippingFeeDraft] = useState(() => String(settings.shippingFee))
  const [isSavingFee, setIsSavingFee] = useState(false)

  useEffect(() => {
    setShippingFeeDraft(String(settings.shippingFee))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.updatedAt])

  const feeDirty = (Number(shippingFeeDraft) || 0) !== settings.shippingFee

  async function handleSaveFee() {
    setIsSavingFee(true)
    try {
      await updateSettings({ shippingFee: Math.max(0, Number(shippingFeeDraft) || 0) })
      toast.success("Shipping fee updated.")
    } catch (err) {
      toast.error(typeof err === "string" ? err : "Failed to update shipping fee.")
    } finally {
      setIsSavingFee(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="App Settings"
        description="Configure what's available to staff when creating and managing orders."
      />

      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCardIcon className="size-4 text-muted-foreground" />
              Payment Settings
            </CardTitle>
            <CardDescription>
              Payment methods staff can select when recording an order.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CatalogList
              items={paymentMethods}
              isLoading={methodsLoading}
              onAdd={addPaymentMethod}
              onRename={renamePaymentMethod}
              onToggle={togglePaymentMethod}
              onDelete={deletePaymentMethod}
              onReorder={reorderPaymentMethods}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCartIcon className="size-4 text-muted-foreground" />
              Order Settings
            </CardTitle>
            <CardDescription>
              Channels staff can attribute an order to.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CatalogList
              items={orderChannels}
              isLoading={channelsLoading}
              onAdd={addOrderChannel}
              onRename={renameOrderChannel}
              onToggle={toggleOrderChannel}
              onDelete={deleteOrderChannel}
              onReorder={reorderOrderChannels}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TruckIcon className="size-4 text-muted-foreground" />
              Shipping Settings
            </CardTitle>
            <CardDescription>
              Default shipping fee applied to new orders.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Field className="w-56">
              <FieldLabel htmlFor="settings-shipping-fee">Shipping Fee</FieldLabel>
              <div className="flex items-center gap-2">
                <CurrencyInput
                  id="settings-shipping-fee"
                  className="h-8"
                  value={shippingFeeDraft}
                  disabled={settingsLoading}
                  onChange={(event) => setShippingFeeDraft(event.target.value)}
                />
                <Button
                  size="sm"
                  onClick={handleSaveFee}
                  disabled={!feeDirty || isSavingFee || settingsLoading}
                >
                  {isSavingFee ? <Spinner className="size-3.5" /> : "Save"}
                </Button>
              </div>
              <FieldDescription>
                Prefills the order form's shipping fee. Staff can still change it per order.
              </FieldDescription>
            </Field>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
