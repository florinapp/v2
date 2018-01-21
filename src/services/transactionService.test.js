import sinon from "sinon";
import * as fs from "fs";
import * as transactionService from "./transactionService";
import db from "../db";
import seed from "../db/seed";
import reset from "../db/reset";
import { setupIndex, setupViews } from "../db/setup";
import Account from "../models/Account";
import Transaction from "../models/Transaction";
import { transactionTypes } from "../models/TransactionType";
import { categoryTypes } from "../models/CategoryType";
import shajs from "sha.js";

const defaultFetchOptions = {
  orderBy: ["date", "asc"],
  pagination: {
    perPage: 999,
    page: 1
  },
  filters: {
    showAccountTransfers: true,
    showOnlyUncategorized: false
  }
};

const newAccount = async (): Account => {
  let account = await db.post(
    new Account({
      name: "Test",
      financialInstitution: "TEST_FI",
      type: "CHECKING"
    })
  );
  account = await db.get(account.id);
  return new Account(account);
};

describe("transactionService.importAccountStatement", () => {
  beforeEach(async () => {
    await reset();
    await setupIndex(db);
    await setupViews(db);
  });

  it("should not import any transactions if OFX is empty", async () => {
    const account = await newAccount();
    const content = fs.readFileSync(`${__dirname}/fixtures/notxn.ofx`);
    const file = new Blob([content]);
    const {
      numImported,
      numSkipped
    } = await transactionService.importAccountStatement(account, file);
    expect(numImported).toBe(0);
    expect(numSkipped).toBe(0);
  });

  it("should import new transactions", async () => {
    const account = await newAccount();
    const content = fs.readFileSync(`${__dirname}/fixtures/newtxns.ofx`);
    const file = new Blob([content]);
    const {
      numImported,
      numSkipped
    } = await transactionService.importAccountStatement(account, file);
    expect(numImported).toBe(3);
    expect(numSkipped).toBe(0);
    const response = await db.find({
      selector: { "metadata.type": "Transaction" }
    });
    expect(response.docs.length).toBe(3);
  });

  it("should skip existing transactions", async () => {
    const log = sinon.stub(console, "log");
    const account = await newAccount();
    const content = fs.readFileSync(`${__dirname}/fixtures/newtxns.ofx`);
    const file = new Blob([content]);
    expect(await transactionService.importAccountStatement(account, file), {
      numImported: 3,
      numSkipped: 0
    });
    expect(await transactionService.importAccountStatement(account, file), {
      numImported: 0,
      numSkipped: 3
    });
    const response = await db.find({
      selector: { "metadata.type": "Transaction" }
    });
    expect(response.docs.length).toBe(3);
    expect(log.calledThrice).toEqual(true);
    log.restore();
  });
});

describe("transactionService.fetch", () => {
  beforeEach(async () => {
    await reset();
    await setupIndex(db);
    await setupViews(db);
  });

  it("should return transactions ordered by date asc by default", async () => {
    await db.post(new Transaction({ _id: "txn1", date: "2017-01-01" }));
    await db.post(new Transaction({ _id: "txn2", date: "2017-02-01" }));
    await db.post(new Transaction({ _id: "txn3", date: "2017-01-15" }));
    const result = await transactionService.fetch(defaultFetchOptions);
    expect(result.result.map(t => t._id)).toEqual(["txn1", "txn3", "txn2"]);
  });

  it("should fetch the associated account", async () => {
    const accountId = (await db.post(new Account({ name: "TEST" }))).id;
    await db.post(
      new Transaction({ _id: "txn1", date: "2017-01-01", accountId })
    );
    const result = await transactionService.fetch(defaultFetchOptions);
    const transactions = result.result;
    expect(transactions.length).toEqual(1);
    expect(transactions[0].account._id).toEqual(accountId);
    expect(transactions[0].account.name).toEqual("TEST");
  });

  it("should set the associated account to undefined when accountId not found", async () => {
    const accountId = "NONEXISTENT";
    await db.post(
      new Transaction({ _id: "txn1", date: "2017-01-01", accountId })
    );
    const result = await transactionService.fetch(defaultFetchOptions);
    const transactions = result.result;
    expect(transactions.length).toEqual(1);
    expect(transactions[0].account).toBe(undefined);
  });

  it("should return transactions ordered by desc when requested", async () => {
    await db.post(new Transaction({ _id: "txn1", date: "2017-01-01" }));
    await db.post(new Transaction({ _id: "txn2", date: "2017-02-01" }));
    await db.post(new Transaction({ _id: "txn3", date: "2017-01-15" }));
    const result = await transactionService.fetch({
      orderBy: ["date", "desc"],
      pagination: {
        perPage: 999,
        page: 1
      },
      filters: {}
    });
    const transactions = result.result;
    expect(transactions.map(t => t._id)).toEqual(["txn2", "txn3", "txn1"]);
  });

  it("should return transactions filtered by date", async () => {
    await db.post(new Transaction({ _id: "txn1", date: "2017-01-01" }));
    await db.post(new Transaction({ _id: "txn2", date: "2017-01-15" }));
    await db.post(new Transaction({ _id: "txn3", date: "2017-02-01" }));

    const result = await transactionService.fetch({
      orderBy: ["date", "asc"],
      pagination: {
        perPage: 999,
        page: 1
      },
      filters: {
        dateFrom: "2017-01-01",
        dateTo: "2017-01-31",
        showOnlyUncategorized: false
      }
    });
    const transactions = result.result;
    expect(transactions.map(t => t._id)).toEqual(["txn1", "txn2"]);
  });

  it("should set the linkedToTransaction attribute when applicable", async () => {
    const txn1 = new Transaction({
      _id: "txn1",
      date: "2017-01-01",
      amount: "3500",
      linkedTo: "txn2"
    });
    const txn2 = new Transaction({
      _id: "txn2",
      date: "2017-02-01",
      amount: "-3500",
      linkedTo: "txn1"
    });
    const txn3 = new Transaction({
      _id: "txn3",
      date: "2018-01-05",
      amount: "-3501"
    });
    await db.post(txn1);
    await db.post(txn2);
    await db.post(txn3);

    const txns = await transactionService.fetch(defaultFetchOptions);
    expect(txns.result[0].linkedToTransaction._id).toBe("txn2");
    expect(txns.result[1].linkedToTransaction._id).toBe("txn1");
    expect(txns.result[2].linkedToTransaction).toBe(undefined);
  });

  it("should exclude account transfers", async () => {
    await db.post(
      new Transaction({
        _id: "txn1",
        date: "2017-01-01",
        categoryId: "internaltransfer"
      })
    );
    await db.post(
      new Transaction({
        _id: "txn2",
        date: "2017-02-01",
        categoryId: "income-salary"
      })
    );
    await db.post(new Transaction({ _id: "txn3", date: "2017-01-15" }));
    const fetchOptions = {
      orderBy: ["date", "asc"],
      pagination: { perPage: 999, page: 1 },
      filters: {
        dateFrom: "2016-01-01",
        dateTo: "2017-06-01",
        showAccountTransfers: false
      }
    };
    const result = await transactionService.fetch(fetchOptions);
    expect(result.result.map(t => t._id)).toEqual(["txn3", "txn2"]);
  });

  it("should fetch by categoryId if specified", async () => {
    await db.post(
      new Transaction({
        _id: "txn1",
        date: "2017-01-01",
        categoryId: "internaltransfer"
      })
    );
    await db.post(
      new Transaction({
        _id: "txn2",
        date: "2017-02-01",
        categoryId: "income-salary"
      })
    );
    await db.post(new Transaction({ _id: "txn3", date: "2017-01-15" }));
    const fetchOptions = {
      orderBy: ["date", "asc"],
      pagination: { perPage: 999, page: 1 },
      filters: { categoryId: "income-salary" }
    };
    const result = await transactionService.fetch(fetchOptions);
    expect(result.result.map(t => t._id)).toEqual(["txn2"]);
  });

  it("should fetch by accountId if specified", async () => {
    await db.post(
      new Transaction({
        _id: "txn1",
        accountId: "acct1",
        date: "2017-01-01"
      })
    );
    await db.post(
      new Transaction({
        _id: "txn2",
        accountId: "acct2",
        date: "2017-02-01",
        categoryId: "income-salary"
      })
    );

    await db.post(
      new Transaction({
        _id: "txn3",
        accountId: "acct1",
        date: "2017-01-15"
      })
    );

    const fetchOptions = {
      orderBy: ["date", "asc"],
      pagination: { perPage: 999, page: 1 },
      filters: { accountId: "acct1" }
    };
    const result = await transactionService.fetch(fetchOptions);
    expect(result.result.map(t => t._id)).toEqual(["txn1", "txn3"]);
  });

  it("should fetch by accountId and categoryId if specified", async () => {
    await db.post(
      new Transaction({
        _id: "txn1",
        accountId: "acct1",
        date: "2017-01-01"
      })
    );
    await db.post(
      new Transaction({
        _id: "txn2",
        accountId: "acct2",
        date: "2017-02-01",
        categoryId: "income-salary"
      })
    );

    await db.post(
      new Transaction({
        _id: "txn3",
        accountId: "acct2",
        date: "2017-01-15"
      })
    );

    const fetchOptions = {
      orderBy: ["date", "asc"],
      pagination: { perPage: 999, page: 1 },
      filters: { accountId: "acct2", categoryId: "income-salary" }
    };
    const result = await transactionService.fetch(fetchOptions);
    expect(result.result.map(t => t._id)).toEqual(["txn2"]);
  });
});

describe("transactionService.fetchUncategorizedTransactionCount", () => {
  beforeEach(async () => {
    await reset();
    await setupIndex(db);
    await setupViews(db);
  });

  it("should fetch uncategorized transaction count in the date range", async () => {
    await db.post(
      new Transaction({
        _id: "txn1",
        accountId: "acct1",
        date: "2017-01-02",
      })
    );
    await db.post(
      new Transaction({
        _id: "txn2",
        accountId: "acct2",
        date: "2017-02-01",
        categoryId: "income-salary"
      })
    );

    await db.post(
      new Transaction({
        _id: "txn3",
        accountId: "acct2",
        date: "2015-01-15"
      })
    );

    const count = await transactionService.fetchUncategorizedTransactionsCount({
        dateFrom: "2017-01-01",
        dateTo: "2017-02-05"
    });
    expect(count).toBe(1);
  });
});

describe("transactionService.updateCategory", () => {
  beforeEach(async () => {
    await reset();
    await setupIndex(db);
    await setupViews(db);
  });

  it("should update transaction category", async () => {
    const response = await db.post(new Transaction());
    await transactionService.updateCategory(
      response.id,
      "automobile-carpayment"
    );
    const transaction = await db.get(response.id);
    expect(transaction.categoryId).toEqual("automobile-carpayment");
  });
});

describe("transactionService.fetchTransactionLinkCandidates", () => {
  beforeEach(async () => {
    await reset();
    await setupIndex(db);
    await setupViews(db);
  });

  it("should return empty when there's no transactions of the same opposite amount", async () => {
    const txn1 = new Transaction({
      _id: "txn1",
      date: "2017-01-01",
      amount: "3500"
    });
    await db.post(txn1);
    await db.post(
      new Transaction({ _id: "txn2", date: "2017-02-01", amount: "-3499" })
    );
    await db.post(
      new Transaction({ _id: "txn3", date: "2017-01-15", amount: "-3501" })
    );
    const candidates = await transactionService.fetchTransactionLinkCandidates(
      txn1
    );
    expect(candidates).toEqual([]);
  });

  it("should return the transaction with the same amount but opposite type", async () => {
    const acct = await newAccount();
    const txn1 = new Transaction({
      _id: "txn1",
      date: "2017-01-01",
      amount: "3500"
    });
    const txn2 = new Transaction({
      _id: "txn2",
      accountId: acct._id,
      date: "2017-02-01",
      amount: "-3500"
    });
    const txn3 = new Transaction({
      _id: "txn3",
      date: "2017-01-15",
      amount: "-3501"
    });
    await db.post(txn1);
    await db.post(txn2);
    await db.post(txn3);
    const candidates = await transactionService.fetchTransactionLinkCandidates(
      txn1
    );
    expect(candidates.length).toEqual(1);
    expect(candidates[0]._id).toEqual("txn2");
    expect(candidates[0].account._id).toEqual(acct._id);
  });

  it("should return sort the candidates by date in desc order", async () => {
    const txn1 = new Transaction({
      _id: "txn1",
      date: "2017-01-01",
      amount: "3500"
    });
    const txn2 = new Transaction({
      _id: "txn2",
      date: "2017-02-01",
      amount: "-3500"
    });
    const txn3 = new Transaction({
      _id: "txn3",
      date: "2016-01-15",
      amount: "-3500"
    });
    const txn4 = new Transaction({
      _id: "txn4",
      date: "2018-01-05",
      amount: "-3500"
    });
    const txn5 = new Transaction({
      _id: "txn5",
      date: "2018-01-05",
      amount: "-3501"
    });
    await db.post(txn1);
    await db.post(txn2);
    await db.post(txn3);
    await db.post(txn4);
    await db.post(txn5);
    const candidates = await transactionService.fetchTransactionLinkCandidates(
      txn1
    );
    expect(candidates.length).toEqual(3);
    expect(candidates.map(c => c._id)).toEqual(["txn4", "txn2", "txn3"]);
  });
});

describe("transactionService.linkTransactions", () => {
  beforeEach(async () => {
    await reset();
    await setupIndex(db);
    await setupViews(db);
  });

  it("should set linkedTo attribute and categoryId", async () => {
    let txn1 = new Transaction({
      _id: "txn1",
      date: "2017-01-01",
      amount: "3500"
    });
    let txn2 = new Transaction({
      _id: "txn2",
      date: "2017-02-01",
      amount: "-3500"
    });

    await transactionService.linkTransactions(txn1, txn2);
    expect(txn1.linkedTo).toEqual("txn2");
    expect(txn1.categoryId).toEqual("internaltransfer");
    expect(txn2.linkedTo).toEqual("txn1");
    expect(txn2.categoryId).toEqual("internaltransfer");

    txn1 = await db.get("txn1");
    txn2 = await db.get("txn2");
    expect(txn1.linkedTo).toEqual("txn2");
    expect(txn1.categoryId).toEqual("internaltransfer");
    expect(txn2.linkedTo).toEqual("txn1");
    expect(txn2.categoryId).toEqual("internaltransfer");
  });
});

describe("transactionService.sumByType", () => {
  const setupFixtures = async () => {
    await db.post(
      new Transaction({
        _id: "txn1",
        date: "2017-01-01",
        amount: "100.99",
        type: transactionTypes.CREDIT
      })
    );
    await db.post(
      new Transaction({
        _id: "txn2",
        date: "2017-02-01",
        amount: "-200.45",
        type: transactionTypes.DEBIT
      })
    );
    await db.post(
      new Transaction({
        _id: "txn3",
        date: "2016-01-15",
        amount: "-100.45",
        type: transactionTypes.DEBIT
      })
    );
    await db.post(
      new Transaction({
        _id: "txn4",
        date: "2018-01-05",
        amount: "-6.66",
        type: transactionTypes.DEBIT
      })
    );
    await db.post(
      new Transaction({
        _id: "txn5",
        date: "2018-01-05",
        amount: "2501.66",
        type: transactionTypes.CREDIT
      })
    );
    await db.post(
      new Transaction({
        _id: "txn6",
        date: "2017-02-05",
        amount: "3000.66",
        type: transactionTypes.CREDIT,
        categoryId: "internaltransfer"
      })
    );
  };

  beforeEach(async () => {
    await reset();
    await setupIndex(db);
    await setupViews(db);
    await setupFixtures();
  });

  it("should return 0 when nothing matches the date filter", async () => {
    const result = await transactionService.sumByType({
      dateFrom: "2018-01-10",
      dateTo: "2018-01-15"
    });
    expect(parseFloat(result.DEBIT)).toBe(0);
    expect(parseFloat(result.CREDIT)).toBe(0);
  });

  it("should return credit matching the date filter", async () => {
    const result = await transactionService.sumByType({
      dateFrom: "2017-01-01",
      dateTo: "2017-01-12"
    });
    expect(parseFloat(result.DEBIT)).toBe(0);
    expect(parseFloat(result.CREDIT)).toBeCloseTo(100.99, 2);
  });

  it("should return debit matching the date filter", async () => {
    const result = await transactionService.sumByType({
      dateFrom: "2017-02-01",
      dateTo: "2017-02-02"
    });
    expect(parseFloat(result.DEBIT)).toBeCloseTo(-200.45, 3);
    expect(parseFloat(result.CREDIT)).toBe(0);
  });

  it("should return both credit/debit amount matching the date filter", async () => {
    const result = await transactionService.sumByType({
      dateFrom: "2016-01-01",
      dateTo: "2018-02-02"
    });
    expect(parseFloat(result.DEBIT)).toBeCloseTo(-307.56, 2);
    expect(parseFloat(result.CREDIT)).toBeCloseTo(2602.65, 2);
  });
});

describe("transactionService.sumByCategory", () => {
  const setupFixtures = async () => {
    await db.post(
      new Transaction({
        _id: "txn1",
        date: "2017-01-01",
        amount: "-100.99",
        type: transactionTypes.DEBIT,
        categoryId: "automobile-carpayment"
      })
    );
    await db.post(
      new Transaction({
        _id: "txn2",
        date: "2017-02-01",
        amount: "-200.45",
        type: transactionTypes.DEBIT,
        categoryId: "automobile-carpayment"
      })
    );
    await db.post(
      new Transaction({
        _id: "txn3",
        date: "2016-01-15",
        amount: "-100.45",
        type: transactionTypes.DEBIT,
        categoryId: "diningout-restaurants"
      })
    );
    await db.post(
      new Transaction({
        _id: "txn4",
        date: "2018-01-05",
        amount: "-996.66",
        type: transactionTypes.DEBIT,
        categoryId: "mortgage"
      })
    );
    await db.post(
      new Transaction({
        _id: "txn5",
        date: "2018-01-05",
        amount: "2501.66",
        type: transactionTypes.CREDIT,
        categoryId: "income-salary"
      })
    );
    await db.post(
      new Transaction({
        _id: "txn6",
        date: "2017-10-05",
        amount: "100",
        type: transactionTypes.CREDIT,
        categoryId: "income-rewards"
      })
    );
  };

  beforeEach(async () => {
    await reset();
    await seed(db);
    await setupIndex(db);
    await setupViews(db);
    await setupFixtures();
  });

  it("should return 0 when nothing matches the date filter", async () => {
    const result = await transactionService.sumByCategory({
      dateFrom: "2018-01-10",
      dateTo: "2018-01-15"
    });
    expect(result.incomeCategories).toEqual([]);
    expect(result.expensesCategories).toEqual([]);
  });

  it("should organize categories by type", async () => {
    const result = await transactionService.sumByCategory({
      dateFrom: "2016-01-01",
      dateTo: "2018-02-15"
    });
    expect(result.incomeCategories).toEqual([
      {
        categoryId: "income-salary",
        categoryName: "Salary",
        categoryType: categoryTypes.INCOME,
        parentCategoryId: null,
        amount: 2501.66
      },
      {
        categoryId: "income-rewards",
        categoryName: "Rewards",
        categoryType: categoryTypes.INCOME,
        parentCategoryId: null,
        amount: 100
      }
    ]);
    expect(result.expensesCategories).toEqual([
      {
        categoryId: "mortgage",
        categoryName: "Mortgage",
        categoryType: categoryTypes.EXPENSE,
        parentCategoryId: undefined,
        amount: -996.66
      },
      {
        categoryId: "automobile-carpayment",
        categoryName: "Car Payment",
        categoryType: categoryTypes.EXPENSE,
        parentCategoryId: "automobile",
        amount: -301.44
      },
      {
        categoryId: "diningout-restaurants",
        categoryName: "Restaurants",
        categoryType: categoryTypes.EXPENSE,
        parentCategoryId: "diningout",
        amount: -100.45
      }
    ]);
  });
});

describe("transactionService.del", () => {
  beforeEach(async () => {
    await reset();
    await seed(db);
    await setupIndex(db);
    await setupViews(db);
  });

  it("should delete existing transaction", async () => {
      await db.post(new Transaction({_id: "txn1"}));
      await db.post(new Transaction({_id: "txn2"}));
      await db.post(new Transaction({_id: "txn3"}));

      await transactionService.del("txn1");
      const result = await db.find({
        selector: {
          "metadata.type": "Transaction"
        }
      });
      expect(result.docs.length).toBe(2);
  })
})

describe("transactionService.create", () => {
  beforeEach(async () => {
    await reset();
    await seed(db);
    await setupIndex(db);
    await setupViews(db);
  });

  it("should create a transaction and populate its checksum field", async () => {
    const txn = await transactionService.create(new Transaction({
      amount: "-19.99",
      date: "2017-01-01",
      name: "PAYMENT 1999",
      memo: "",
      type: transactionTypes.DEBIT
    }));

    expect(txn._id === undefined).toBe(false);
    expect(txn._id === null).toBe(false);

    const sha = shajs("sha256");
    sha.update("-19.99");
    sha.update("2017-01-01");
    sha.update("PAYMENT 1999");
    sha.update(transactionTypes.DEBIT);
    const checksum = sha.digest("hex");
    expect(txn.checksum).toEqual(`sha256:${checksum}`);
  });
})

describe("transactionService.update", () => {
  beforeEach(async () => {
    await reset();
    await seed(db);
    await setupIndex(db);
    await setupViews(db);
  });

  it("should update the fields and update checksum", async () => {
    const txn = await transactionService.create(new Transaction({
      amount: "-19.99",
      date: "2017-01-01",
      name: "PAYMENT 1999",
      memo: "",
      type: transactionTypes.DEBIT
    }));

    txn.memo = "HELLO";
    await transactionService.update(txn._id, txn);

    const updatedTxn = await db.get(txn._id)
    expect(updatedTxn.memo).toEqual("HELLO");
    const sha = shajs("sha256");
    sha.update("-19.99");
    sha.update("2017-01-01");
    sha.update("PAYMENT 1999");
    sha.update("HELLO");
    sha.update(transactionTypes.DEBIT);
    const checksum = sha.digest("hex");
    expect(updatedTxn.checksum).toEqual(`sha256:${checksum}`);
  });
})
