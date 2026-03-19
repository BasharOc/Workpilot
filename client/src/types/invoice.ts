export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface Invoice {
  id: string;
  userId: string;
  clientId: string;
  invoiceNumber: string;
  status: "draft" | "sent" | "paid" | "cancelled";
  issueDate: string;
  dueDate: string | null;
  items: InvoiceItem[];
  notes: string | null;
  currency: "EUR" | "USD" | "CHF";
  createdAt: string;
  client: {
    id: string;
    name: string;
    email?: string | null;
    address?: string | null;
    company?: string | null;
  };
}

export const STATUS_LABELS: Record<Invoice["status"], string> = {
  draft: "Draft",
  sent: "Sent",
  paid: "Paid",
  cancelled: "Cancelled",
};

export const STATUS_STYLES: Record<Invoice["status"], string> = {
  draft: "bg-zinc-100 text-zinc-600 border-zinc-200",
  sent: "bg-blue-50 text-blue-700 border-blue-200",
  paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled: "bg-red-50 text-red-600 border-red-200",
};

export const CURRENCY_SYMBOLS: Record<Invoice["currency"], string> = {
  EUR: "€",
  USD: "$",
  CHF: "CHF",
};

export function computeTotal(items: InvoiceItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
}

export function formatMoney(
  amount: number,
  currency: Invoice["currency"],
): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency,
  }).format(amount);
}
