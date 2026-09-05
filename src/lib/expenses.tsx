import { useEffect } from "react"

import { useAppDispatch, useAppSelector } from "@/lib/hooks"
import {
  createExpenseThunk,
  createRecurringExpenseThunk,
  deleteExpenseThunk,
  deleteRecurringExpenseThunk,
  fetchExpensesThunk,
  fetchRecurringExpensesThunk,
  setExpensesParams,
  updateExpenseThunk,
  updateRecurringExpenseThunk,
} from "@/lib/expenses-slice"
import type {
  ExpenseInput,
  ExpensesQueryParams,
  RecurringExpenseInput,
} from "@/lib/expenses-slice"

export {
  EXPENSE_CATEGORIES,
  EXPENSE_PAYMENT_METHODS,
  RECURRENCE_FREQUENCIES,
  RECURRENCE_FREQUENCY_LABELS,
} from "@/lib/expenses-slice"
export type {
  Expense,
  ExpenseCategory,
  ExpenseInput,
  ExpensePaymentMethod,
  ExpensesQueryParams,
  RecurrenceFrequency,
  RecurringExpense,
  RecurringExpenseInput,
} from "@/lib/expenses-slice"

/** Paginated Expenses list — for the Expenses list page only. Refetches whenever `params` changes. */
export function useExpenses() {
  const expenses = useAppSelector((state) => state.expenses.items)
  const total = useAppSelector((state) => state.expenses.total)
  const params = useAppSelector((state) => state.expenses.params)
  const status = useAppSelector((state) => state.expenses.status)
  const error = useAppSelector((state) => state.expenses.error)
  const dispatch = useAppDispatch()

  useEffect(() => {
    dispatch(fetchExpensesThunk(params))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    dispatch,
    params.page,
    params.pageSize,
    params.search,
    params.category,
    params.paymentMethod,
    params.dateFrom,
    params.dateTo,
    params.sortBy,
    params.sortDir,
  ])

  function setParams(patch: Partial<ExpensesQueryParams>) {
    dispatch(setExpensesParams(patch))
  }

  function refetch() {
    dispatch(fetchExpensesThunk(params))
  }

  return {
    expenses,
    total,
    params,
    setParams,
    refetch,
    isLoading: status === "idle" || (status === "loading" && expenses.length === 0),
    isFetching: status === "loading" && expenses.length > 0,
    isError: status === "failed",
    error,
  }
}

/** Expense create/update/delete only — no list fetch. For the Expenses page and its dialogs. */
export function useExpenseActions() {
  const dispatch = useAppDispatch()

  async function addExpense(input: ExpenseInput) {
    await dispatch(createExpenseThunk(input)).unwrap()
  }

  async function updateExpense(id: string, input: ExpenseInput) {
    await dispatch(updateExpenseThunk({ id, input })).unwrap()
  }

  async function deleteExpense(id: string) {
    await dispatch(deleteExpenseThunk(id)).unwrap()
  }

  return { addExpense, updateExpense, deleteExpense }
}

/** Full recurring-expense schedule list (admin/superadmin only), fetched once per session. */
export function useRecurringExpenses() {
  const recurring = useAppSelector((state) => state.expenses.recurring)
  const status = useAppSelector((state) => state.expenses.recurringStatus)
  const error = useAppSelector((state) => state.expenses.recurringError)
  const dispatch = useAppDispatch()

  useEffect(() => {
    if (status === "idle") dispatch(fetchRecurringExpensesThunk())
  }, [dispatch, status])

  return {
    recurring,
    isLoading: status === "idle" || status === "loading",
    isError: status === "failed",
    error,
  }
}

/** Recurring-expense create/update/delete/pause-resume only — no list fetch. */
export function useRecurringExpenseActions() {
  const dispatch = useAppDispatch()

  async function addRecurringExpense(input: RecurringExpenseInput) {
    await dispatch(createRecurringExpenseThunk(input)).unwrap()
  }

  async function updateRecurringExpense(
    id: string,
    input: Partial<RecurringExpenseInput> & { active?: boolean }
  ) {
    await dispatch(updateRecurringExpenseThunk({ id, input })).unwrap()
  }

  async function setRecurringExpenseActive(id: string, active: boolean) {
    await dispatch(updateRecurringExpenseThunk({ id, input: { active } })).unwrap()
  }

  async function deleteRecurringExpense(id: string) {
    await dispatch(deleteRecurringExpenseThunk(id)).unwrap()
  }

  return {
    addRecurringExpense,
    updateRecurringExpense,
    setRecurringExpenseActive,
    deleteRecurringExpense,
  }
}
