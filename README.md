# paynl-node

Simple PayNL SDK for Node.js that uses promises and no singletons

## Usage

You can set verbose to `true` during development, but disable it in production.

### Starting a transaction

```typescript
const paynl = new Paynl({ apiToken: "your-token", serviceId: "your-service-id", verbose: true });

try {
    const result = await paynl.startTransaction({
        amount: 999, // equals 9.99 EUR
        returnUrl: "https://my-return-url.com",
        ipAddress: "10.20.30.40",
        currency: "EUR",
        description: "Order 1234",
        testMode: true,
        paymentMethodId: 10,
    });
    const transactionId = result.transactionId;
} catch (error) {
    console.error(error);
    // Do something with the error
}
```

## Warning!

-   This is not an official SDK.
-   This SDK expects all prices to be in cents. It is recommended to do price calculations in cents in your code, floating point calculations are not precice and could cause unexpected roundings.
