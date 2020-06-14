export interface InvoiceData {
    merchantId: string;
    invoiceId: string;
    amount: number;
    description: string;
    invoiceUrl?: string;
    makeYesterday?: boolean;
}
