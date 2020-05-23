import { ProductType } from "./ProductType";

export interface Product {
    /**
     * Your id of the product
     */
    id: string;
    /**
     * The name of the product
     */
    name: string;
    /**
     * The price of the product
     */
    price: number;
    /**
     * the amount of vat for this product
     */
    tax: number;
    /**
     * The quantity of this product in the order
     */
    qty: number;
    /**
     * The type of this product in the order
     */
    type: ProductType;
}
