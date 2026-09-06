import { createSlice, type PayloadAction } from "@reduxjs/toolkit"

const SALES_VISIBILITY_STORAGE_KEY = "dgprints_sales_visible"

export type SalesVisibilityState = {
  isVisible: boolean
}

function getInitialVisibility(): boolean {
  return localStorage.getItem(SALES_VISIBILITY_STORAGE_KEY) === "visible"
}

const initialState: SalesVisibilityState = {
  isVisible: getInitialVisibility(),
}

const salesVisibilitySlice = createSlice({
  name: "salesVisibility",
  initialState,
  reducers: {
    salesVisibilitySet(state, action: PayloadAction<boolean>) {
      state.isVisible = action.payload
    },
  },
})

export const { salesVisibilitySet } = salesVisibilitySlice.actions
export default salesVisibilitySlice.reducer
export { SALES_VISIBILITY_STORAGE_KEY }
