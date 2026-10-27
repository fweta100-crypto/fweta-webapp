import { createClient } from "@supabase/supabase-js";

import type { DatabaseStore } from "./types";

const STORE_ROW_ID = "default";

const emptyStore = (): DatabaseStore => ({
  profiles: [],
  campaigns: [],
  submissions: [],
  viewSnapshots: [],
  wallets: [],
  ledgerEntries: [],
  payoutMethods: [],
  withdrawalRequests: [],
  influencerProfiles: [],
  rateCards: [],
  bookings: [],
  brandDeposits: [],
  fraudFlags: [],
});

function supabaseUrl(): string | undefined {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    process.env.SUPABASE_URL?.trim() ||
    undefined
  );
}

/** Prefer Vercel–Supabase integration secret, then explicit service role. */
function supabaseServiceKey(): string | undefined {
  return (
    process.env.SUPABASE_SECRET_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    undefined
  );
}

export function isSupabaseStoreEnabled(): boolean {
  return Boolean(supabaseUrl() && supabaseServiceKey());
}

function createServiceClient() {
  const url = supabaseUrl()!;
  const key = supabaseServiceKey()!;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function normalizeStore(raw: unknown): DatabaseStore | null {
  if (!raw || typeof raw !== "object") return null;
  const base = emptyStore();
  const input = raw as Record<string, unknown>;
  const store = { ...base, ...input } as DatabaseStore;

  // Supabase JSON may contain null arrays — coerce so .filter/.map never throw.
  (Object.keys(base) as (keyof DatabaseStore)[]).forEach((key) => {
    if (!Array.isArray(store[key])) {
      (store as Record<string, unknown>)[key] = [];
    }
  });

  return store;
}

function hasData(store: DatabaseStore): boolean {
  return (
    store.profiles.length > 0 ||
    store.campaigns.length > 0 ||
    store.submissions.length > 0
  );
}

async function loadJsonBlob(): Promise<DatabaseStore | null> {
  try {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("fweta_app_store")
    .select("data")
    .eq("id", STORE_ROW_ID)
    .maybeSingle();

  if (error || !data?.data) return null;
  return normalizeStore(data.data);
  } catch (err) {
    console.warn("[fweta] JSON blob load failed:", err instanceof Error ? err.message : err);
    return null;
  }
}

async function saveJsonBlob(store: DatabaseStore): Promise<boolean> {
  try {
  const supabase = createServiceClient();
  const { error } = await supabase.from("fweta_app_store").upsert(
    {
      id: STORE_ROW_ID,
      data: store,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );
  if (error) {
    console.warn("[fweta] JSON blob save failed:", error.message);
    return false;
  }
  return true;
  } catch (err) {
    console.warn("[fweta] JSON blob save failed:", err instanceof Error ? err.message : err);
    return false;
  }
}

async function loadRelationalStore(): Promise<DatabaseStore | null> {
  try {
  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc("fweta_load_store");

  if (error) {
    if (!error.message.includes("Could not find the function")) {
      console.warn("[fweta] Relational load failed:", error.message);
    }
    return null;
  }

  return normalizeStore(data);
  } catch (err) {
    console.warn("[fweta] Relational load failed:", err instanceof Error ? err.message : err);
    return null;
  }
}

async function saveRelationalStore(store: DatabaseStore): Promise<boolean> {
  try {
  const supabase = createServiceClient();
  const { error } = await supabase.rpc("fweta_save_store", { payload: store });

  if (error) {
    if (!error.message.includes("Could not find the function")) {
      console.warn("[fweta] Relational save failed:", error.message);
    }
    return false;
  }
  return true;
  } catch (err) {
    console.warn("[fweta] Relational save failed:", err instanceof Error ? err.message : err);
    return false;
  }
}

function mergeMissingProfiles(local: DatabaseStore, remote: DatabaseStore): DatabaseStore {
  const emails = new Set(local.profiles.map((p) => (p.email || "").trim().toLowerCase()));
  const extra = remote.profiles.filter((p) => p.email && !emails.has(p.email.trim().toLowerCase()));
  if (extra.length === 0) return local;
  const extraIds = new Set(extra.map((p) => p.id));
  const walletIds = new Set(local.wallets.map((w) => w.userId));
  return {
    ...local,
    profiles: [...local.profiles, ...extra],
    wallets: [
      ...local.wallets,
      ...remote.wallets.filter((w) => extraIds.has(w.userId) && !walletIds.has(w.userId)),
    ],
  };
}

export async function loadStoreFromSupabase(): Promise<DatabaseStore | null> {
  try {
    // JSON blob is the full store. Reading fweta_* tables first drops
    // fields those tables don't have, and would hide accounts that only
    // exist inside the blob.
    const jsonBlob = await loadJsonBlob();
    if (jsonBlob && hasData(jsonBlob)) {
      return jsonBlob;
    }

    const relational = await loadRelationalStore();
    if (relational && hasData(relational)) {
      return relational;
    }

    return jsonBlob ?? relational ?? emptyStore();
  } catch (err) {
    console.warn("[fweta] loadStoreFromSupabase failed:", err instanceof Error ? err.message : err);
    return emptyStore();
  }
}

export type SupabaseStoreDiagnostics = {
  jsonBlobLoadOk: boolean;
  jsonBlobLoadError: string | null;
  jsonBlobSaveOk: boolean;
  jsonBlobSaveError: string | null;
  relationalLoadOk: boolean;
  relationalLoadError: string | null;
  profileCount: number;
};

/** Production health check — tests load + round-trip save without leaking secrets. */
export async function diagnoseSupabaseStore(): Promise<SupabaseStoreDiagnostics> {
  const result: SupabaseStoreDiagnostics = {
    jsonBlobLoadOk: false,
    jsonBlobLoadError: null,
    jsonBlobSaveOk: false,
    jsonBlobSaveError: null,
    relationalLoadOk: false,
    relationalLoadError: null,
    profileCount: 0,
  };

  if (!isSupabaseStoreEnabled()) return result;

  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("fweta_app_store")
      .select("data")
      .eq("id", STORE_ROW_ID)
      .maybeSingle();

    if (error) {
      result.jsonBlobLoadError = error.message;
    } else {
      result.jsonBlobLoadOk = true;
      const store = normalizeStore(data?.data) ?? emptyStore();
      result.profileCount = store.profiles.length;
    }
  } catch (e) {
    result.jsonBlobLoadError = e instanceof Error ? e.message : "load threw";
  }

  try {
    const supabase = createServiceClient();
    const probeId = "__health_probe__";
    const { error } = await supabase.from("fweta_app_store").upsert(
      {
        id: probeId,
        data: { probe: true },
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );
    if (error) {
      result.jsonBlobSaveError = error.message;
    } else {
      result.jsonBlobSaveOk = true;
      await supabase.from("fweta_app_store").delete().eq("id", probeId);
    }
  } catch (e) {
    result.jsonBlobSaveError = e instanceof Error ? e.message : "save threw";
  }

  try {
    const supabase = createServiceClient();
    const { error } = await supabase.rpc("fweta_load_store");
    if (error) {
      if (error.message.includes("Could not find the function")) {
        result.relationalLoadError = "fweta_load_store not installed (optional)";
      } else {
        result.relationalLoadError = error.message;
      }
    } else {
      result.relationalLoadOk = true;
    }
  } catch (e) {
    result.relationalLoadError = e instanceof Error ? e.message : "rpc threw";
  }

  return result;
}

export async function saveStoreToSupabase(store: DatabaseStore): Promise<boolean> {
  // JSON blob upsert is safe; relational save deletes all rows first and can wipe data on failure.
  // Keep remote accounts a stale local cache does not know about.
  const remote = await loadJsonBlob();
  const toSave = remote ? mergeMissingProfiles(store, remote) : store;
  const jsonOk = await saveJsonBlob(toSave);
  if (process.env.FWETA_RELATIONAL_SYNC === "true") {
    const relationalOk = await saveRelationalStore(toSave);
    return jsonOk || relationalOk;
  }
  return jsonOk;
}
