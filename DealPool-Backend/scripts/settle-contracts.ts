import pool from "../src/config/db";
import {
    findContractsPastDisputeDeadline,
    findContractById,
    updateContractStatus,
} from "../src/models/contract.model";
import { releaseEscrow } from "../src/services/ledger.service";

export const settleContracts = async (): Promise<{ settledCount: number; skippedCount: number }> => {
    const contracts = await findContractsPastDisputeDeadline();
    let settledCount = 0;
    let skippedCount = 0;

    console.log(`[SettleContracts] Found ${contracts.length} candidate contract(s) past dispute deadline.`);

    for (const c of contracts) {
        const client = await pool.connect();
        try {
            await client.query("BEGIN");

            // 3. Concurrency Guard: Re-check dispute state inside transaction per contract
            const contract = await findContractById(c.id, client);
            if (
                !contract ||
                contract.status !== "returned" ||
                contract.condition_disputed === true ||
                !contract.dispute_deadline ||
                new Date(contract.dispute_deadline).getTime() >= Date.now()
            ) {
                console.log(`[SettleContracts] Skipping contract ${c.id} (state or dispute condition changed).`);
                skippedCount++;
                await client.query("ROLLBACK");
                continue;
            }

            const rentalFee = Number(contract.rental_fee || 0);
            const securityDeposit = Number(contract.security_deposit || 0);

            // Release rental fee to provider
            if (rentalFee > 0) {
                await releaseEscrow(
                    contract.id,
                    contract.requester_id,
                    contract.provider_id,
                    rentalFee,
                    "escrow_payout_fee",
                    client,
                    `Auto-settled rental fee payout for contract ${contract.id}`
                );
            }

            // Release security deposit to requester
            if (securityDeposit > 0) {
                await releaseEscrow(
                    contract.id,
                    contract.requester_id,
                    contract.requester_id,
                    securityDeposit,
                    "escrow_release_security",
                    client,
                    `Auto-settled security deposit return for contract ${contract.id}`
                );
            }

            // Update contract status to completed
            await updateContractStatus(contract.id, "completed", {}, client);

            await client.query("COMMIT");
            settledCount++;
            console.log(`[SettleContracts] Successfully settled contract ${contract.id}.`);
        } catch (error) {
            await client.query("ROLLBACK");
            console.error(`[SettleContracts] Error settling contract ${c.id}:`, error);
        } finally {
            client.release();
        }
    }

    console.log(`[SettleContracts] Settlement run complete: ${settledCount} settled, ${skippedCount} skipped.`);
    return { settledCount, skippedCount };
};

// If run directly from CLI
if (process.argv[1]?.endsWith("settle-contracts.ts") || process.argv[1]?.endsWith("settle-contracts.js")) {
    settleContracts()
        .then(() => {
            pool.end();
            process.exit(0);
        })
        .catch((err) => {
            console.error("[SettleContracts] Fatal error in cron runner:", err);
            pool.end();
            process.exit(1);
        });
}
