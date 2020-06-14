import https from "https";
import { IncomingMessage } from "http";
import { TransactionStart, TransactionStartOptions } from "./interfaces/TransactionStart";
import { StartResult } from "./interfaces/StartResult";
import { TransactionResult } from "./interfaces/TransactionResult";
import { InvoiceData } from "./interfaces/InvoiceData";

export class PaynlError extends Error {}
/**
 *
 * Contains the configurations for transactions.
 */
export class Paynl {
    private apiToken: string;
    private serviceId: string;
    private hostname = "rest-api.pay.nl";
    private verbose: boolean;

    constructor(config: { apiToken: string; serviceId: string; verbose?: boolean }) {
        this.apiToken = config.apiToken;
        this.serviceId = config.serviceId;
        this.verbose = config.verbose ?? false;
    }

    /**
     * Generate the url of the API to call
     */
    private getUrl(controller, action, version) {
        let url = "/v" + version;
        url += "/" + controller;
        url += "/" + action;
        url += "/json";
        return url;
    }

    /**
     * Checks if the result is an error (there are many ways the api can return an error)
     */
    private isError(body: object) {
        if (body["status"] && body["status"] == "FALSE") {
            return body["error"];
        }
        if (body["request"] && body["request"]["result"] && body["request"]["result"] == "0" && body["request"]["errorId"] && body["request"]["errorMessage"]) {
            return body["request"]["errorId"] + " " + body["request"]["errorMessage"];
        }
        return false;
    }

    /**
     * Do a post request on the API.
     */
    private post(controller: string, action: string, version: number, data = {}): Promise<any> {
        return new Promise((resolve, reject) => {
            // Append credentials in body
            data["token"] = this.apiToken;
            data["serviceId"] = this.serviceId;

            let jsonData = JSON.stringify(data);
            const req = https.request(
                {
                    hostname: this.hostname,
                    path: this.getUrl(controller, action, version),
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Content-Length": jsonData.length,
                    },
                    timeout: 10000,
                },
                (response: IncomingMessage) => {
                    if (this.verbose) {
                        console.log(`statusCode: ${response.statusCode}`);
                        console.log(`HEADERS: ${JSON.stringify(response.headers)}`);
                    }

                    const chunks: any[] = [];

                    response.on("data", (chunk) => {
                        chunks.push(chunk);
                    });

                    response.on("end", () => {
                        try {
                            if (!response.statusCode) {
                                reject(new Error("Unexpected order of events"));
                                return;
                            }
                            const body = Buffer.concat(chunks).toString();

                            if (this.verbose) {
                                console.log(body);
                            }

                            let json: any;
                            try {
                                json = JSON.parse(body);
                            } catch (error) {
                                if (this.verbose) {
                                    console.error(error);
                                }
                                // invalid json
                                if (response.statusCode < 200 || response.statusCode >= 300) {
                                    if (body.length == 0) {
                                        console.error(response.statusCode);
                                        reject(new PaynlError("Status " + response.statusCode));
                                        return;
                                    }
                                    console.error(response.statusCode + " " + body);
                                    reject(new PaynlError(body));
                                    return;
                                } else {
                                    // something wrong: throw parse error
                                    reject(error);
                                    return;
                                }
                            }

                            if (response.statusCode < 200 || response.statusCode >= 300) {
                                if (this.isError(json) !== false) {
                                    reject(new PaynlError(this.isError(json)));
                                    return;
                                }
                                reject(new PaynlError(response.statusCode + " " + response.statusMessage));
                                return;
                            }

                            if (this.isError(json) !== false) {
                                reject(new PaynlError(this.isError(json)));
                                return;
                            }

                            resolve(json);
                        } catch (error) {
                            if (this.verbose) {
                                console.error(error);
                            }
                            reject(error);
                        }
                    });
                }
            );

            // use its "timeout" event to abort the request
            req.on("timeout", () => {
                req.abort();
            });

            req.on("error", (error) => {
                if (this.verbose) {
                    console.error(error);
                }
                reject(error);
            });

            req.write(jsonData);
            req.end();
        });
    }

    async startTransaction(options: TransactionStartOptions): Promise<StartResult> {
        // Basic validation for non TypeScript environments
        if (!options.amount) {
            throw new Error("Amount is not set or 0");
        }

        if (!options.returnUrl) {
            throw new Error("returnUrl is not set");
        }

        if (!options.ipAddress) {
            throw new Error("ipAddress is not set");
        }

        const startData = new TransactionStart(options);
        const result = await this.post("transaction", "start", 8, startData.getForApi());
        return new StartResult(result);
    }

    async getTransaction(transactionId: string): Promise<TransactionResult> {
        const response = await this.post("transaction", "info", 8, { transactionId: transactionId });
        response["transactionId"] = transactionId;
        return new TransactionResult(response);
    }

    async addInvoice(invoiceData: InvoiceData): Promise<{ referenceId: string }> {
        return await this.post("Alliance", "addInvoice", 2, invoiceData);
    }

    /**
     * Request all the available payment methods and settings of the current merchant / service
     */
    async getService(): Promise<any> {
        const result = await this.post("Transaction", "getService", 12, {});
        return result;
    }
}
