import { createAuthService } from "./services/authService";
import { createChangeService } from "./services/changeService";
import { createPurchaseService } from "./services/purchaseService";
import { createSiteService } from "./services/siteService";
import { createSupplierService } from "./services/supplierService";
import { createTaskService } from "./services/taskService";
import { createUpdateService } from "./services/updateService";
import { createWorkerService } from "./services/workerService";

interface ApiClientOptions {
    bypassToken?: string;
}
export const createApiClient = (apiUrl: string, options?: ApiClientOptions) => {
    const baseHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
    };
    if (options?.bypassToken) {
        baseHeaders['x-vercel-protection-bypass'] = options.bypassToken;
    }
    return {
        SiteService: createSiteService(apiUrl, baseHeaders),
        TaskService: createTaskService(apiUrl, baseHeaders),
        ChangeService: createChangeService(apiUrl, baseHeaders),
        UpdateService: createUpdateService(apiUrl, baseHeaders),
        PurchaseService: createPurchaseService(apiUrl, baseHeaders),
        SupplierService: createSupplierService(apiUrl, baseHeaders),
        AuthService: createAuthService(apiUrl, baseHeaders),
        WorkerService: createWorkerService(apiUrl, baseHeaders),
    }
};