const createCommonActionTypes = (action: string) => {
  // Common action types are a triple of $action_REQUESTED, $action_SUCCEEDED, $action_FAILED
  const STATES = ["REQUESTED", "SUCCEEDED", "FAILED"];
  const retval = {};
  STATES.forEach(state => {
    retval[`${action}_${state}`] = `${action}_${state}`;
  });
  return retval;
};

export const SHOW_GLOBAL_MODAL = "SHOW_GLOBAL_MODAL";
export const HIDE_GLOBAL_MODAL = "HIDE_GLOBAL_MODAL";

export const {
  FETCH_ACCOUNTS_REQUESTED,
  FETCH_ACCOUNTS_SUCCEEDED,
  FETCH_ACCOUNTS_FAILED
} = createCommonActionTypes("FETCH_ACCOUNTS");

export const {
  DELETE_ACCOUNT_REQUESTED,
  DELETE_ACCOUNT_SUCCEEDED,
  DELETE_ACCOUNT_FAILED
} = createCommonActionTypes("DELETE_ACCOUNT");

export const {
  CREATE_ACCOUNT_REQUESTED,
  CREATE_ACCOUNT_SUCCEEDED,
  CREATE_ACCOUNT_FAILED
} = createCommonActionTypes("CREATE_ACCOUNT");

export const {
  FETCH_ACCOUNT_BY_ID_REQUESTED,
  FETCH_ACCOUNT_BY_ID_SUCCEEDED,
  FETCH_ACCOUNT_BY_ID_FAILED
} = createCommonActionTypes("FETCH_ACCOUNT_BY_ID");

export const {
  UPDATE_ACCOUNT_REQUESTED,
  UPDATE_ACCOUNT_SUCCEEDED,
  UPDATE_ACCOUNT_FAILED
} = createCommonActionTypes("UPDATE_ACCOUNT");

export const {
  IMPORT_ACCOUNT_STATEMENT_REQUESTED,
  IMPORT_ACCOUNT_STATEMENT_SUCCEEDED,
  IMPORT_ACCOUNT_STATEMENT_FAILED
} = createCommonActionTypes("IMPORT_ACCOUNT_STATEMENT");

export const {
  FETCH_TRANSACTIONS_REQUESTED,
  FETCH_TRANSACTIONS_SUCCEEDED,
  FETCH_TRANSACTIONS_FAILED
} = createCommonActionTypes("FETCH_TRANSACTIONS");

export const {
  FETCH_CATEGORIES_REQUESTED,
  FETCH_CATEGORIES_SUCCEEDED,
  FETCH_CATEGORIES_FAILED
} = createCommonActionTypes("FETCH_CATEGORIES");

export const {
  SEED_CATEGORIES_REQUESTED,
  SEED_CATEGORIES_SUCCEEDED,
  SEED_CATEGORIES_FAILED
} = createCommonActionTypes("SEED_CATEGORIES");

export const {
  CREATE_CATEGORY_REQUESTED,
  CREATE_CATEGORY_SUCCEEDED,
  CREATE_CATEGORY_FAILED
} = createCommonActionTypes("CREATE_CATEGORY");

export const {
  UPDATE_CATEGORY_REQUESTED,
  UPDATE_CATEGORY_SUCCEEDED,
  UPDATE_CATEGORY_FAILED
} = createCommonActionTypes("UPDATE_CATEGORY");

export const {
  DELETE_CATEGORY_REQUESTED,
  DELETE_CATEGORY_SUCCEEDED,
  DELETE_CATEGORY_FAILED
} = createCommonActionTypes("DELETE_CATEGORY");

export const {
  UPDATE_TRANSACTION_CATEGORY_REQUESTED,
  UPDATE_TRANSACTION_CATEGORY_SUCCEEDED,
  UPDATE_TRANSACTION_CATEGORY_FAILED
} = createCommonActionTypes("UPDATE_TRANSACTION_CATEGORY");

export const {
  DATERANGE_CHANGE_REQUESTED,
  DATERANGE_CHANGE_SUCCEEDED,
  DATERANGE_CHANGE_FAILED
} = createCommonActionTypes("DATERANGE_CHANGE");

export const {
  FETCH_SYNCS_REQUESTED,
  FETCH_SYNCS_SUCCEEDED,
  FETCH_SYNCS_FAILED
} = createCommonActionTypes("FETCH_SYNCS");

export const {
  CREATE_SYNC_REQUESTED,
  CREATE_SYNC_SUCCEEDED,
  CREATE_SYNC_FAILED
} = createCommonActionTypes("CREATE_SYNC");

export const {
  DELETE_SYNC_REQUESTED,
  DELETE_SYNC_SUCCEEDED,
  DELETE_SYNC_FAILED
} = createCommonActionTypes("DELETE_SYNC");

export const SYNC_STARTED = "SYNC_STARTED";
export const SYNC_PAUSED = "SYNC_PAUSED";
export const SYNC_ERRORED = "SYNC_ERRORED";
export const SYNC_DENIED = "SYNC_DENIED";

export const OPEN_LINK_TRANSACTIONS_DIALOG = "OPEN_LINK_TRANSACTIONS_DIALOG";
export const CLOSE_LINK_TRANSACTIONS_DIALOG = "CLOSE_LINK_TRANSACTIONS_DIALOG";

export const {
  FETCH_TRANSACTION_LINK_CANDIDATES_REQUESTED,
  FETCH_TRANSACTION_LINK_CANDIDATES_SUCCEEDED,
  FETCH_TRANSACTION_LINK_CANDIDATES_FAILED
} = createCommonActionTypes("FETCH_TRANSACTION_LINK_CANDIDATES");

export const {
  LINK_TRANSACTIONS_REQUESTED,
  LINK_TRANSACTIONS_SUCCEEDED,
  LINK_TRANSACTIONS_FAILED
} = createCommonActionTypes("LINK_TRANSACTIONS");

export const {
  FETCH_INCOME_EXPENSES_STATS_REQUESTED,
  FETCH_INCOME_EXPENSES_STATS_SUCCEEDED,
  FETCH_INCOME_EXPENSES_STATS_FAILED,
} = createCommonActionTypes("FETCH_INCOME_EXPENSES_STATS");

export const {
  FETCH_CATEGORY_SUMMARIES_REQUESTED,
  FETCH_CATEGORY_SUMMARIES_SUCCEEDED,
  FETCH_CATEGORY_SUMMARIES_FAILED
} = createCommonActionTypes("FETCH_CATEGORY_SUMMARIES");

export const {
  FETCH_UNCATEGORIZED_TRANSACTION_COUNT_REQUESTED,
  FETCH_UNCATEGORIZED_TRANSACTION_COUNT_SUCCEEDED,
  FETCH_UNCATEGORIZED_TRANSACTION_COUNT_FAILED,
} = createCommonActionTypes("FETCH_UNCATEGORIZED_TRANSACTION_COUNT");

export const CHANGE_ACCOUNT_LIST_GROUP_BY_OPTION_SUCCEEDED = "CHANGE_ACCOUNT_LIST_GROUP_BY_OPTION_SUCCEEDED";

export const {
  CREATE_TRANSACTION_REQUESTED,
  CREATE_TRANSACTION_SUCCEEDED,
  CREATE_TRANSACTION_FAILED
} = createCommonActionTypes("CREATE_TRANSACTION");

export const {
  DELETE_TRANSACTION_REQUESTED,
  DELETE_TRANSACTION_SUCCEEDED,
  DELETE_TRANSACTION_FAILED
} = createCommonActionTypes("DELETE_TRANSACTION");

export const {
  FETCH_TRANSACTION_BY_ID_REQUESTED,
  FETCH_TRANSACTION_BY_ID_SUCCEEDED,
  FETCH_TRANSACTION_BY_ID_FAILED
} = createCommonActionTypes("FETCH_TRANSACTION_BY_ID");

export const {
  UPDATE_TRANSACTION_REQUESTED,
  UPDATE_TRANSACTION_SUCCEEDED,
  UPDATE_TRANSACTION_FAILED
} = createCommonActionTypes("UPDATE_TRANSACTION");

export const {
  FETCH_SETTINGS_REQUESTED,
  FETCH_SETTINGS_SUCCEEDED,
  FETCH_SETTINGS_FAILED
} = createCommonActionTypes("FETCH_SETTINGS");

export const {
  UPDATE_SETTINGS_REQUESTED,
  UPDATE_SETTINGS_SUCCEEDED,
  UPDATE_SETTINGS_FAILED
} = createCommonActionTypes("UPDATE_SETTINGS");