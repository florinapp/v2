// @flow
import PromiseFileReader from "promise-file-reader";
import Account from "../models/Account";
import Transaction from "../models/Transaction";
import db from "../db";
import OfxAdapter from "./OfxAdapter";
import type FetchOptions from "./FetchOptions";
import PaginationResult from "./PaginationResult";
import { thisMonth } from "../models/presetDateRanges";
import { transactionTypes } from "../models/TransactionType";
import { CategorySummary, Summary } from "../models/CategorySummary";
import Category from "../models/Category";
import { categoryTypes } from "../models/CategoryType";
import { MAX_NUMBER } from "../common/const";
import ServiceError from "./ServiceError";

const Decimal = require('decimal.js/decimal.min');

const thisMonthDateRange = thisMonth();

// TODO: make this a function
export const defaultFetchOptions = {
  orderBy: ["date", "desc"],
  pagination: {
    perPage: 10,
    page: 1
  },
  filters: {
    dateFrom: thisMonthDateRange.start.format("YYYY-MM-DD"),
    dateTo: thisMonthDateRange.end.format("YYYY-MM-DD"),
    showAccountTransfers: false,
    showOnlyUncategorized: false,
    categoryId: undefined,
    accountId: undefined
  }
};

const fetchAssociatedObjects = async (associatedObjectIds: Set<string>, fetchObjectById) => {
  const promises = [...associatedObjectIds].map(async aid => {
    try {
      return await fetchObjectById(aid);
    } catch (error) {
      if (parseInt(error.status, 10) === 404) {
        return undefined;
      }
      throw error;
    }
  });
  const associatedObjects = await Promise.all(promises);
  const associatedObjectsMap = associatedObjects.reduce((aggregate, current) => {
    if (current !== undefined) {
      aggregate.set(current._id, current);
    }
    return aggregate;
  }, new Map());

  return associatedObjectsMap;
}

const fetchTransactionAccounts = async (transactions: Array<Transaction>) => {
  const accountIds = new Set(transactions.filter(t => t.accountId).map(t => t.accountId));
  const accountMap = await fetchAssociatedObjects(accountIds, async (aid) => {
    const doc = await db.get(aid);
    return new Account(doc);
  });
  transactions.forEach(t => {
    t.account = accountMap.get(t.accountId);
  });
};

const fetchLinkedTransactions = async (transactions: Array<Transaction>) => {
  const transactionIds = new Set(
    transactions.filter(t => t.linkedTo).map(t => t.linkedTo)
  );
  const transactionMap = await fetchAssociatedObjects(transactionIds, async (tid) => {
    const doc = await db.get(tid);
    return new Transaction(doc);
  });
  transactions.forEach(t => {
    t.linkedToTransaction = transactionMap.get(t.linkedTo);
  });
};

const getTotalRows = async (query): Promise<Number> => {
  const queryForTotalRows = {
    ...query,
    fields: [],
    limit: MAX_NUMBER,
    skip: 0
  }
  const resultForTotalRows = await db.find(queryForTotalRows);
  return resultForTotalRows.docs.length;
}

const addCategorySelector = (query, filters): {} => {
  let categoryIdClauses = [];
  if (filters.categoryId !== undefined) {
    categoryIdClauses = [...categoryIdClauses, { $eq: filters.categoryId }];
  }

  if (filters.showOnlyUncategorized) {
    categoryIdClauses = [...categoryIdClauses, { $exists: false }];
  }

  if (!filters.showAccountTransfers) {
    categoryIdClauses = [...categoryIdClauses, { $ne: "internaltransfer" }];
  }

  if (categoryIdClauses.length === 0) {
    return query;
  }

  const categoryId = categoryIdClauses.reduce((aggregate, current) => {
    return { ...aggregate, ...current };
  }, {});

  return {
    ...query,
    selector: {
      ...query.selector,
      categoryId
    }
  }
}

const addAccountIdSelector = (query, filters): {} => {
  const { accountId } = filters;
  if (accountId === undefined) {
    return query;
  }

  return {
    ...query,
    selector: {
      ...query.selector,
      accountId
    }
  }
}

export const fetch = async (options: FetchOptions = defaultFetchOptions):  Promise<PaginationResult<Transaction>> => {
  const { pagination, orderBy, filters } = options;
  let query = {
    selector: {
      "metadata.type": "Transaction",
      date: {
        $gte: filters.dateFrom ? filters.dateFrom : "",
        $lte: filters.dateTo ? filters.dateTo : "9999",
      }
    },
    sort: [{date: orderBy[1]}]
  }

  const filterProcessors = [addCategorySelector, addAccountIdSelector];
  query = filterProcessors.reduce((aggregate, filterProcessor) => filterProcessor(aggregate, filters), query);
  query = {
    ...query,
    limit: pagination.perPage,
    skip: (pagination.page - 1) * pagination.perPage
  }

  const totalRows = await getTotalRows(query);
  const result = await db.find(query)
  const transactions = result.docs.map(doc => new Transaction(doc));
  await fetchTransactionAccounts(transactions);
  await fetchLinkedTransactions(transactions);
  return new PaginationResult(transactions, totalRows);
}

export const fetchById = async (transactionId: string): Promise<Transaction> => {
  const transaction = new Transaction(await db.get(transactionId))
  await fetchTransactionAccounts([transaction]);
  await fetchLinkedTransactions([transaction]);
  return transaction;
}

export const update = async (transactionId: string, transactionData: Transaction): Promise<Transaction> => {
  const transaction = {
    ...(await db.get(transactionId)),
    ...transactionData
  };

  await db.put(new Transaction(transaction));
  return (await fetchById(transactionId));
}

export const fetchUncategorizedTransactionsCount = async (filters: {dateFrom: string, dateTo: string}): Promise<Number> => {
  let query = {
    selector: {
      "metadata.type": "Transaction",
      date: {
        $gte: filters.dateFrom ? filters.dateFrom : "",
        $lte: filters.dateTo ? filters.dateTo : "9999"
      },
      categoryId: {
        $exists: false
      },
    },
    fields: [],
    limit: MAX_NUMBER,
    skip: 0
  };
  const result = await db.find(query);
  return result.docs.length;
};

export const updateCategory = async (
  transactionId: string,
  categoryId: string
) => {
  const txn = await db.get(transactionId);
  txn.categoryId = categoryId;
  await db.put(txn);
};

export const saveNewTransaction = async (transaction: Transaction): Promise<String> => {
  const response = await db.find({
    selector: {
      "metadata.type": {
        $eq: "Transaction"
      },
      checksum: {
        $eq: transaction.checksum
      }
    }
  });
  if (response.docs.length !== 0) {
    throw new ServiceError("Transaction is already imported");
  }
  return (await db.post(transaction)).id;
};

export const importAccountStatement = async (
  account: Account,
  statementFile: File
): Promise<{ numImported: number, numSkipped: number }> => {
  const fileContent = await PromiseFileReader.readAsText(statementFile);
  const ofxAdapter = new OfxAdapter(fileContent);
  const transactions = await ofxAdapter.getTransactions(account);
  const dbPromises = transactions.map(async t => {
    try {
      await saveNewTransaction(t);
      return true;
    } catch (error) {
      console.log(error);
      return false;
    }
  });

  const numImported = 0;
  const numSkipped = 0;
  const resolvedResults = await Promise.all(dbPromises);
  const numImported = resolvedResults.filter(r => r === true).length;
  const numSkipped = resolvedResults.filter(r => r === false).length;

  const balance = await ofxAdapter.getBalance();
  account.addAccountBalanceRecord(balance.dateTime, balance.amount);
  await db.put(account);
  return { numImported, numSkipped };
};

export const fetchTransactionLinkCandidates = async (transaction: Transaction): Promise<Array<Transaction>> => {
  const amount = (new Decimal(transaction.amount) * -1).toString();
  const options = {
    startkey: [amount, "9999"],
    endkey: [amount, ""],
    include_docs: true,
    descending: true
  };
  const response = await db.query("transactions/byAmount", options);
  const transactions = response.rows.map(r => new Transaction(r.doc));
  await fetchTransactionAccounts(transactions);
  return transactions;
};

export const linkTransactions = async (
  transaction1: Transaction,
  transaction2: Transaction
) => {
  transaction1.linkedTo = transaction2._id;
  transaction1.categoryId = "internaltransfer";
  transaction2.linkedTo = transaction1._id;
  transaction2.categoryId = "internaltransfer";
  await db.put(transaction1);
  await db.put(transaction2);
};

export const create = async (transactionData: Transaction): Promise<Transaction> => {
  const id = await saveNewTransaction(transactionData);
  return new Transaction(await db.get(id));
}

export const del = async (transactionId: string) => {
  const doc = await db.get(transactionId);
  await db.remove(doc);
}

export const sumByType = async (filter: { dateFrom: string, dateTo: string }) => {
  let result = await db.query("transactions/byType", {
    startkey: [transactionTypes.CREDIT, filter.dateFrom],
    endkey: [transactionTypes.CREDIT, filter.dateTo]
  });
  const totalCredit = result.rows.length > 0 ? result.rows[0].value : 0;

  result = await db.query("transactions/byType", {
    startkey: [transactionTypes.DEBIT, filter.dateFrom],
    endkey: [transactionTypes.DEBIT, filter.dateTo]
  });
  const totalDebit = result.rows.length > 0 ? result.rows[0].value : 0;

  return {
    [transactionTypes.CREDIT]: totalCredit,
    [transactionTypes.DEBIT]: totalDebit
  };
};

export const sumByCategory = async (filter: { dateFrom: string, dateTo: string }): Promise<CategorySummary> => {
  const options = {
    startkey: [filter.dateFrom],
    endkey: [filter.dateTo]
  };
  const result = await db.query("transactions/byCategory", options);
  const stats = result.rows.length > 0 ? result.rows[0].value : null;
  let incomeCategories = [];
  let expensesCategories = [];

  if (stats) {
    const categoryIds = new Set(Object.keys(stats))
    const categoryMap = await fetchAssociatedObjects(categoryIds, async (cid) => {
      const doc = await db.get(cid);
      return new Category(doc);
    });

    const summaries = [...categoryIds].map(categoryId => {
      const category = categoryMap.get(categoryId);
      if (!category) {
        return null;
      }

      const categorySummary = new Summary({
          categoryId,
          categoryName: category.name,
          categoryType: category.type,
          parentCategoryId: category.parent,
          amount: stats[categoryId]
      });

      return categorySummary
    });
    incomeCategories = summaries.filter(cs => cs && cs.categoryType === categoryTypes.INCOME);
    expensesCategories = summaries.filter(cs => cs && cs.categoryType === categoryTypes.EXPENSE);
    incomeCategories.sort((a, b) => b.amount - a.amount);
    expensesCategories.sort((a, b) => a.amount - b.amount);
  }
  return new CategorySummary({
    incomeCategories,
    expensesCategories
  });
};