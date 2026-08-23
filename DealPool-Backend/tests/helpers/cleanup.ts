/**
 * Shared test cleanup utility.
 * Deletes Firebase Auth users and Postgres rows created during tests.
 */
import { firebaseAuth } from "../../src/config/firebase";
import pool from "../../src/config/db";

interface CleanupTracker {
  firebaseUids: string[];
  dealIds: string[];
  offerIds: string[];
  resourceIds: string[];
  contractIds: string[];
  reportIds: string[];
  profileIds: string[];
}

export function createCleanupTracker(): CleanupTracker {
  return {
    firebaseUids: [],
    dealIds: [],
    offerIds: [],
    resourceIds: [],
    contractIds: [],
    reportIds: [],
    profileIds: [],
  };
}

/**
 * Delete all tracked test data from both Firebase Auth and Postgres.
 * Call this in a `finally` block or `afterAll`.
 */
export async function cleanupTestData(tracker: CleanupTracker): Promise<void> {
  const errors: Error[] = [];

  // Delete Postgres rows in dependency order (children first)
  const deletions: Array<{ table: string; ids: string[] }> = [
    { table: "reports", ids: tracker.reportIds },
    { table: "contracts", ids: tracker.contractIds },
    { table: "offers", ids: tracker.offerIds },
    { table: "deals", ids: tracker.dealIds },
    { table: "resources", ids: tracker.resourceIds },
  ];

  for (const { table, ids } of deletions) {
    if (ids.length === 0) continue;
    try {
      await pool.query(
        `DELETE FROM ${table} WHERE id = ANY($1::uuid[])`,
        [ids]
      );
    } catch (err) {
      errors.push(new Error(`Failed to clean ${table}: ${err}`));
    }
  }

  // Delete wallets and profiles by user_id (Firebase UID → profile → wallet)
  for (const profileId of tracker.profileIds) {
    try {
      await pool.query(`DELETE FROM wallets WHERE user_id = $1`, [profileId]);
    } catch (err) {
      errors.push(new Error(`Failed to clean wallet for ${profileId}: ${err}`));
    }
    try {
      await pool.query(`DELETE FROM profiles WHERE id = $1`, [profileId]);
    } catch (err) {
      errors.push(new Error(`Failed to clean profile ${profileId}: ${err}`));
    }
  }

  // Delete Firebase Auth users
  for (const uid of tracker.firebaseUids) {
    try {
      await firebaseAuth.deleteUser(uid);
    } catch (err) {
      errors.push(new Error(`Failed to delete Firebase user ${uid}: ${err}`));
    }
  }

  if (errors.length > 0) {
    console.warn("Cleanup warnings:", errors.map((e) => e.message).join("; "));
  }
}
