import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit"

import { apiClient } from "@/lib/api-client"
import { getErrorMessage } from "@/lib/api-error"
import type { RootState } from "@/lib/store"

export const EXPENSE_CATEGORIES = [
  "Travel and Transportation",
  "Office and Facilities",
  "Office Supplies and Equipment",
  "Payroll and Employee Costs",
  "Sales and Marketing",
  "Professional Services",
  "Insurance and Compliance",
  "Others",
] as const
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]

export const EXPENSE_PAYMENT_METHODS = ["Cash", "GCash", "Maya", "Debit/Credit Card"] as const
export type ExpensePaymentMethod = (typeof EXPENSE_PAYMENT_METHODS)[number]

export const RECURRENCE_FREQUENCIES = ["daily", "weekly", "monthly"] as const
export type RecurrenceFrequency = (typeof RECURRENCE_FREQUENCIES)[number]

export const RECURRENCE_FREQUENCY_LABELS: Record<RecurrenceFrequency, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
}

export type Expense = {
  id: string
  date: string
  amount: number
  category: string
  paymentMethod: string
  notes: string
  createdBy: string | null
  createdByName: string
  recurringExpenseId: string | null
  createdAt: string
  updatedAt: string
}

export type ExpenseInput = {
  date: string
  amount: number
  category: string
  paymentMethod: string
  notes: string
}

export type RecurringExpense = {
  id: string
  amount: number
  category: string
  paymentMethod: string
  notes: string
  frequency: RecurrenceFrequency
  startDate: string
  nextRunDate: string
  active: boolean
  createdBy: string | null
  createdByName: string
  createdAt: string
  updatedAt: string
}

export type RecurringExpenseInput = {
  amount: number
  category: string
  paymentMethod: string
  notes: string
  frequency: RecurrenceFrequency
  startDate: string
}

export type ExpensesQueryParams = {
  page: number
  pageSize: number
  search: string
  category: string
  paymentMethod: string
  dateFrom: string
  dateTo: string
  sortBy: string
  sortDir: "asc" | "desc"
}

export type ExpensesListResponse = {
  items: Expense[]
  total: number
  page: number
  pageSize: number
}

export const fetchExpensesThunk = createAsyncThunk<
  ExpensesListResponse,
  ExpensesQueryParams,
  { rejectValue: string; state: RootState }
>("expenses/fetchAll", async (params, { rejectWithValue }) => {
  try {
    const { data } = await apiClient.get<ExpensesListResponse>("/expenses", {
      params: {
        page: params.page,
        pageSize: params.pageSize,
        search: params.search || undefined,
        category: params.category || undefined,
        paymentMethod: params.paymentMethod || undefined,
        dateFrom: params.dateFrom || undefined,
        dateTo: params.dateTo || undefined,
        sortBy: params.sortBy,
        sortDir: params.sortDir,
      },
    })
    return data
  } catch (err) {
    return rejectWithValue(getErrorMessage(err))
  }
})

export const createExpenseThunk = createAsyncThunk<Expense, ExpenseInput, { rejectValue: string }>(
  "expenses/create",
  async (input, { rejectWithValue }) => {
    try {
      const { data } = await apiClient.post<Expense>("/expenses", input)
      return data
    } catch (err) {
      return rejectWithValue(getErrorMessage(err))
    }
  }
)

export const updateExpenseThunk = createAsyncThunk<
  Expense,
  { id: string; input: ExpenseInput },
  { rejectValue: string }
>("expenses/update", async ({ id, input }, { rejectWithValue }) => {
  try {
    const { data } = await apiClient.put<Expense>(`/expenses/${id}`, input)
    return data
  } catch (err) {
    return rejectWithValue(getErrorMessage(err))
  }
})

export const deleteExpenseThunk = createAsyncThunk<string, string, { rejectValue: string }>(
  "expenses/delete",
  async (id, { rejectWithValue }) => {
    try {
      await apiClient.delete(`/expenses/${id}`)
      return id
    } catch (err) {
      return rejectWithValue(getErrorMessage(err))
    }
  }
)

export const fetchRecurringExpensesThunk = createAsyncThunk<
  RecurringExpense[],
  void,
  { rejectValue: string }
>("expenses/fetchAllRecurring", async (_arg, { rejectWithValue }) => {
  try {
    const { data } = await apiClient.get<{ items: RecurringExpense[] }>("/expenses/recurring")
    return data.items
  } catch (err) {
    return rejectWithValue(getErrorMessage(err))
  }
})

export const createRecurringExpenseThunk = createAsyncThunk<
  RecurringExpense,
  RecurringExpenseInput,
  { rejectValue: string }
>("expenses/createRecurring", async (input, { rejectWithValue }) => {
  try {
    const { data } = await apiClient.post<RecurringExpense>("/expenses/recurring", input)
    return data
  } catch (err) {
    return rejectWithValue(getErrorMessage(err))
  }
})

export const updateRecurringExpenseThunk = createAsyncThunk<
  RecurringExpense,
  { id: string; input: Partial<RecurringExpenseInput> & { active?: boolean } },
  { rejectValue: string }
>("expenses/updateRecurring", async ({ id, input }, { rejectWithValue }) => {
  try {
    const { data } = await apiClient.put<RecurringExpense>(`/expenses/recurring/${id}`, input)
    return data
  } catch (err) {
    return rejectWithValue(getErrorMessage(err))
  }
})

export const deleteRecurringExpenseThunk = createAsyncThunk<string, string, { rejectValue: string }>(
  "expenses/deleteRecurring",
  async (id, { rejectWithValue }) => {
    try {
      await apiClient.delete(`/expenses/recurring/${id}`)
      return id
    } catch (err) {
      return rejectWithValue(getErrorMessage(err))
    }
  }
)

type ExpensesState = {
  items: Expense[]
  total: number
  status: "idle" | "loading" | "succeeded" | "failed"
  error: string | null
  latestRequestId: string | null
  params: ExpensesQueryParams
  recurring: RecurringExpense[]
  recurringStatus: "idle" | "loading" | "succeeded" | "failed"
  recurringError: string | null
}

const initialState: ExpensesState = {
  items: [],
  total: 0,
  status: "idle",
  error: null,
  latestRequestId: null,
  params: {
    page: 1,
    pageSize: 10,
    search: "",
    category: "",
    paymentMethod: "",
    dateFrom: "",
    dateTo: "",
    sortBy: "date",
    sortDir: "desc",
  },
  recurring: [],
  recurringStatus: "idle",
  recurringError: null,
}

const expensesSlice = createSlice({
  name: "expenses",
  initialState,
  reducers: {
    setExpensesParams(state, action: PayloadAction<Partial<ExpensesQueryParams>>) {
      state.params = { ...state.params, ...action.payload }
    },
  },
  extraReducers(builder) {
    builder
      .addCase(fetchExpensesThunk.pending, (state, action) => {
        state.status = "loading"
        state.error = null
        state.latestRequestId = action.meta.requestId
      })
      .addCase(fetchExpensesThunk.fulfilled, (state, action) => {
        if (action.meta.requestId !== state.latestRequestId) return
        state.status = "succeeded"
        state.items = action.payload.items
        state.total = action.payload.total
      })
      .addCase(fetchExpensesThunk.rejected, (state, action) => {
        if (action.meta.requestId !== state.latestRequestId) return
        state.status = "failed"
        state.error = action.payload ?? "Failed to load expenses."
      })
      .addCase(fetchRecurringExpensesThunk.pending, (state) => {
        state.recurringStatus = "loading"
        state.recurringError = null
      })
      .addCase(
        fetchRecurringExpensesThunk.fulfilled,
        (state, action: PayloadAction<RecurringExpense[]>) => {
          state.recurringStatus = "succeeded"
          state.recurring = action.payload
        }
      )
      .addCase(fetchRecurringExpensesThunk.rejected, (state, action) => {
        state.recurringStatus = "failed"
        state.recurringError = action.payload ?? "Failed to load recurring expenses."
      })
      .addCase(
        createRecurringExpenseThunk.fulfilled,
        (state, action: PayloadAction<RecurringExpense>) => {
          state.recurring.unshift(action.payload)
        }
      )
      .addCase(
        updateRecurringExpenseThunk.fulfilled,
        (state, action: PayloadAction<RecurringExpense>) => {
          const index = state.recurring.findIndex((item) => item.id === action.payload.id)
          if (index !== -1) state.recurring[index] = action.payload
        }
      )
      .addCase(
        deleteRecurringExpenseThunk.fulfilled,
        (state, action: PayloadAction<string>) => {
          state.recurring = state.recurring.filter((item) => item.id !== action.payload)
        }
      )
  },
})

export const { setExpensesParams } = expensesSlice.actions
export default expensesSlice.reducer
export type { ExpensesState }
