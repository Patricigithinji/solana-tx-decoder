// deepDecode.js
const { Connection, PublicKey, clusterApiUrl } = require("@solana/web3.js");
const { decodeInstruction } = require("@solana/spl-token");

async function deepDecode(signature) {
  const connection = new Connection(clusterApiUrl("mainnet-beta"), "confirmed");

  console.log("\n🔍 Fetching transaction:", signature);
  const tx = await connection.getTransaction(signature, {
    maxSupportedTransactionVersion: 2,
  });

  if (!tx) {
    console.log("❌ Transaction not found on mainnet.");
    return;
  }

  const message = tx.transaction.message;
  const meta = tx.meta;

  console.log("\n==============================");
  console.log("📦 BASIC INFO");
  console.log("==============================");
  console.log("Slot:", tx.slot);
  console.log("Block Time:", tx.blockTime ? new Date(tx.blockTime * 1000).toISOString() : "N/A");
  console.log("Fee:", meta.fee);
  console.log("Status:", meta.err ? "❌ FAILED" : "✅ SUCCESS");

  console.log("\n==============================");
  console.log("👥 ACCOUNTS (with signer + writable)");
  console.log("==============================");
  message.accountKeys.forEach((k, i) => {
    console.log(
      `${i}. ${k.toBase58()} | signer: ${message.isAccountSigner(i)} | writable: ${message.isAccountWritable(i)}`
    );
  });

  console.log("\nFee Payer:", message.accountKeys[0].toBase58());

  console.log("\n==============================");
  console.log("🧩 INSTRUCTIONS (decoded)");
  console.log("==============================");

  for (let i = 0; i < message.instructions.length; i++) {
    const ix = message.instructions[i];
    const programId = message.accountKeys[ix.programIdIndex];

    console.log(`\nInstruction #${i + 1}`);
    console.log("Program ID:", programId.toBase58());

    // Try SPL-Token decoding
    try {
      const decoded = decodeInstruction(
        { programId, keys: ix.accounts.map(a => ({ pubkey: message.accountKeys[a] })) },
        ix.data
      );
      console.log("Decoded SPL Token Instruction:", decoded);
      continue;
    } catch (e) {}

    console.log("Accounts:", ix.accounts.map(a => message.accountKeys[a].toBase58()));
    console.log("Raw Data (base64):", ix.data);
  }

  if (meta.preTokenBalances || meta.postTokenBalances) {
    console.log("\n==============================");
    console.log("💰 TOKEN TRANSFERS (pre/post changes)");
    console.log("==============================");

    const balances = {};

    (meta.preTokenBalances || []).forEach(b => {
      balances[b.accountIndex] = { pre: b };
    });

    (meta.postTokenBalances || []).forEach(b => {
      balances[b.accountIndex] = { ...(balances[b.accountIndex] || {}), post: b };
    });

    Object.entries(balances).forEach(([index, data]) => {
      console.log(`Account #${index}`);
      console.log(" PRE:", data.pre);
      console.log(" POST:", data.post);
      console.log();
    });
  }

  console.log("\n==============================");
  console.log("📝 RUNTIME LOGS");
  console.log("==============================");
  meta.logMessages?.forEach(l => console.log(l));
}

const sig = process.argv[2];
if (!sig) {
  console.log("Usage: node deepDecode.js <signature>");
  process.exit();
}

deepDecode(sig);
