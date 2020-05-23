import { Product } from "./Product";
import { EndUser } from "./EndUser";
import { Address } from "./Address";
import { InvoiceAddress } from "./InvoiceAddress";
import * as dateformat from "dateformat";

export interface TransactionStartOptions {
    /**
     * The total amount for this order
     */
    amount: number;
    /**
     * The return url, we will redirect the user to this url after payment and cancellation
     */
    returnUrl: string;
    /**
     * The ipaddress of the user, we use this for fraud checks.
     * If you dont have an ip, like when you are generating payment links, use 10.20.30.40
     */
    ipAddress: string;
    /**
     * 3-letter ISO-4217 Code for the currency
     */
    currency?: string;
    /**
     * The time until when the payment link is valid
     */
    expireDate?: Date;
    /**
     * Also known as IPN or webHook
     * We call this url when the status of the transaction changes
     */
    exchangeUrl?: string;
    /**
     * The id of the paymentmethod.
     * Use PaymentMethods.getList() to retrieve the available paymentmethods
     */
    paymentMethodId?: number;
    /**
     * The id of the bank, only for iDEAL
     */
    bankId?: number;
    /**
     * The TH-code of the terminal
     */
    terminalId?: string;
    /**
     * The description of the transaction.
     */
    description?: string;
    /**
     * The number belonging to the order.
     */
    orderNumber?: string;
    /**
     * Set to true if you want to do a sandbox transaction
     */
    testMode?: boolean;
    /**
     * 2-Letter language code
     */
    language?: string;
    /**
     * Free value
     */
    extra1?: string;
    /**
     * Free value
     */
    extra2?: string;
    /**
     * Free value
     */
    extra3?: string;

    /**
     * The invoiceDate
     */
    invoiceDate?: Date;
    /**
     * The delivery date
     */
    deliveryDate?: Date;

    /**
     * If the transaction is an order, supply the products here
     */
    products?: Product[];
    /**
     * The customer
     */
    enduser?: EndUser;
    /**
     * The shipping address
     */
    address?: Address;
    /**
     * The invoice address
     */
    invoiceAddress?: InvoiceAddress;
}

export class TransactionStart {
    options: TransactionStartOptions;
    constructor(options: TransactionStartOptions) {
        this.options = options;
    }

    private formatDate(date: Date) {
        return dateformat(date, "dd-mm-yyyy");
    }

    private formatDateTime(date: Date) {
        return dateformat(date, "dd-mm-yyyy hh:MM:ss");
    }

    private calculateVatCode(priceIncl, vatAmount) {
        var vatCodes = { 0: "N", 9: "L", 21: "H" };
        var priceExcl = priceIncl - vatAmount;
        if (!vatAmount || vatAmount == 0 || !priceIncl || priceIncl == 0) {
            return vatCodes[0];
        }

        var vatRate = (vatAmount / priceExcl) * 100;

        var closest = Object.keys(vatCodes).reduce((prev, curr) => {
            var prevFloat = parseFloat(prev);
            var currFloat = parseFloat(curr);
            return Math.abs(currFloat - vatRate) < Math.abs(prevFloat - vatRate) ? curr : prev;
        });

        return vatCodes[closest];
    }

    getForApi() {
        var data = {};
        data["amount"] = Math.round(this.options.amount * 100);
        data["finishUrl"] = this.options.returnUrl;
        data["ipAddress"] = this.options.ipAddress;

        if (this.options.paymentMethodId) data["paymentOptionId"] = this.options.paymentMethodId;
        if (this.options.bankId) data["paymentOptionSubId"] = this.options.bankId;
        if (this.options.terminalId) data["paymentOptionSubId"] = this.options.terminalId;
        if (this.options.testMode) data["testMode"] = 1;

        data["transaction"] = {};
        if (this.options.currency) data["transaction"]["currency"] = this.options.currency;
        if (this.options.expireDate) data["transaction"]["expireDate"] = this.formatDateTime(this.options.expireDate);
        if (this.options.exchangeUrl) data["transaction"]["orderExchangeUrl"] = this.options.exchangeUrl;
        if (this.options.description) data["transaction"]["description"] = this.options.description;
        if (this.options.orderNumber) data["transaction"]["orderNumber"] = this.options.orderNumber;

        data["statsData"] = {};
        if (this.options.extra1) data["statsData"]["extra1"] = this.options.extra1;
        if (this.options.extra2) data["statsData"]["extra2"] = this.options.extra2;
        if (this.options.extra3) data["statsData"]["extra3"] = this.options.extra3;
        data["statsData"]["object"] = "nodejssdk";

        if (Object.keys(data["statsData"]).length == 0) {
            delete data["statsData"];
        }

        data["enduser"] = {};
        if (this.options.language) data["enduser"]["language"] = this.options.language;
        if (this.options.enduser) {
            if (this.options.enduser.initials) data["enduser"]["initials"] = this.options.enduser.initials;
            if (this.options.enduser.lastName) data["enduser"]["lastName"] = this.options.enduser.lastName;
            if (this.options.enduser.gender) data["enduser"]["gender"] = this.options.enduser.gender;
            if (this.options.enduser.dob) data["enduser"]["dob"] = this.formatDate(this.options.enduser.dob);
            if (this.options.enduser.phoneNumber) data["enduser"]["phoneNumber"] = this.options.enduser.phoneNumber;
            if (this.options.enduser.emailAddress) data["enduser"]["emailAddress"] = this.options.enduser.emailAddress;
        }
        if (this.options.address) {
            data["enduser"]["address"] = this.options.address;
            data["enduser"]["address"]["streetNumber"] = data["enduser"]["address"]["houseNumber"];
            delete data["enduser"]["address"]["houseNumber"];
            data["enduser"]["address"]["streetNumberExtension"] = data["enduser"]["address"]["houseNumberExtension"];
            delete data["enduser"]["address"]["houseNumberExtension"];
        }
        if (this.options.invoiceAddress) {
            data["enduser"]["invoiceAddress"] = this.options.invoiceAddress;

            data["enduser"]["invoiceAddress"]["streetNumber"] = data["enduser"]["invoiceAddress"]["houseNumber"];
            delete data["enduser"]["invoiceAddress"]["houseNumber"];

            data["enduser"]["invoiceAddress"]["streetNumberExtension"] = data["enduser"]["invoiceAddress"]["houseNumberExtension"];
            delete data["enduser"]["address"]["houseNumberExtension"];
        }

        data["saleData"] = {};
        if (this.options.invoiceDate) data["saleData"]["invoiceDate"] = this.formatDate(this.options.invoiceDate);
        if (this.options.deliveryDate) data["saleData"]["deliveryDate"] = this.formatDate(this.options.deliveryDate);
        if (this.options.products) {
            data["saleData"]["orderData"] = this.options.products.map((product) => {
                return {
                    productId: product.id,
                    description: product.name,
                    price: Math.round(product.price * 100),
                    quantity: product.qty,
                    vatCode: this.calculateVatCode(product.price, product.tax),
                    productType: product.type,
                };
            });
        }

        return data;
    }
}
