import { Address } from "./Address";

export interface InvoiceAddress extends Address {
    initials?: string;
    lastName?: string;
    gender?: string;
}
