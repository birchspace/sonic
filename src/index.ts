import fs from "fs"
import bs58 from 'bs58'
import task from 'tasuku'
import Sonic from "./sonic";
import web3 from "@solana/web3.js"
import fetch from "node-fetch"
import axios from "axios";

const connection = new web3.Connection(
  "https://devnet.sonic.game", 'finalized'
);

const SOL_LAMPORts = 1000000000;
// 0.6SOL
const SOL_LAMPORTS_MIN = 600000000;

// clientKey
const clientKey = "";
const websiteKey = "0x4AAAAAAAc6HG1RMG_8EHSC";
const websiteURL = "https://faucet.sonic.game";

// 验证码类型：
// 这个没有测试过
// const taskType = "TurnstileTaskProxyless";
// 这个更稳定 但是更贵
const taskType = "TurnstileTaskProxyless";

async function run(key: string, keys: string[], sol: number) {
  const sonic = new Sonic(key, connection)

  const give_next = sol * SOL_LAMPORts


  await task(`${sonic.keypair.publicKey.toString()}`, async ({ setTitle }) => {

    const data = await sonic.init()

    const balance = await sonic.getBalance()

    setTitle(`${sonic.keypair.publicKey.toString()}: balance is ${balance / SOL_LAMPORts} sol`)

    if (balance < SOL_LAMPORTS_MIN && clientKey != "") {
      setTitle(`${sonic.keypair.publicKey.toString()}: claim 1 sol by faucet`)
      await claimByFaucet(sonic.keypair.publicKey.toString())
    }

    let title = `${sonic.keypair.publicKey.toString()}`

    const user = await sonic.status()

    title = title + ":"

    setTitle(title)

    if (!user.checked) {

      const checkInTask = await task("making check in", async ({ setTitle }) => {

        const checkInTx = await sonic.buildCheckInTx()

        if (checkInTx) {
          setTitle("making check in" + ": get hash successfully")

          const sendcheckInTx = await sonic.sendTx(connection, checkInTx)

          await sonic.checkInHadnle(sendcheckInTx.txid)
          title = title + " " + "checkIn" + " " + "√"
        }

        setTitle("check in done.")
      })

      checkInTask.clear()
    }

    if (user.total_transactions < 100) {
      const times = 110 - user.total_transactions
      const transactionstask = await task(`transactions has been completed 0`, async ({ setTitle }) => {

        for (let i = 0; i < times; i++) {
          let receiverKey: string

          do {
            receiverKey = keys[Math.floor(Math.random() * keys.length)]
          } while (receiverKey === key);

          const receiverKeypair = web3.Keypair.fromSecretKey(bs58.decode(receiverKey));

          const minAmount = Math.floor(give_next * 1.0);
          const maxAmount = Math.floor(give_next * 1.1);

          const amountInSol = Math.floor(Math.random() * (maxAmount - minAmount) + minAmount);


          const nestedTask = await task(`-> ${receiverKeypair.publicKey.toString()}`, async () => {
            await sonic.sendSol(sonic.keypair, receiverKeypair.publicKey.toString(), amountInSol)
          })

          nestedTask.clear()

          setTitle(`transactions has been completed ${i}`)
        }

        await sonic.sleep(3000)

      })

      transactionstask.clear()

      title = title + " " + "transactions" + " " + "√"
      setTitle(title)
    }

    if (!user.transactions_1_claimed || !user.transactions_2_claimed || !user.transactions_3_claimed) {
      await sonic.claim()
    }

    title = title + " " + "Done"
    setTitle(title)
  })
}

async function ringLottery(key: string, times: number) {
  const sonic = new Sonic(key, connection)

  await sonic.init()

  await task(`${sonic.keypair.publicKey.toString()} scratch lottery tickets`, async ({ setTitle }) => {

    let title = `${sonic.keypair.publicKey.toString()}`
    let win = 0
    let lose = 0

    for (const time of Array.from({ length: times })) {

      const lotteryTx = await sonic.buildLotteryTx()

      const sendLotteryTx = await sonic.sendTx(connection, lotteryTx)

      const draw = await sonic.lotteryDraw(sendLotteryTx.txid)

      const res = await sonic.isLotteryWinner(draw?.block_number)

      if (res?.is === "true") {
        win += res.rewards
      }

      if (res?.is === "false") {
        lose += 1
      }

      title = `${sonic.keypair.publicKey.toString()} lottery scratching: win ${win} lose ${lose}`;

      setTitle(title)
    }
  })
}

async function claimByFaucet(pubkey: string) {
  const taskId = await createTask();
  if (taskId) {
    const response = await getResponse(taskId);
    if (response) {
      // 领水
      const url = `https://faucet-api.sonic.game/airdrop/${pubkey}/1/${response}`;
      const faucetRes = await fetch(url, {
        method: "GET",
        agent: false,
        rejectUnauthorized: false,
      });
    }
  }
}

async function createTask() {
  try {
    const url = "https://api.yescaptcha.com/createTask";
    const data = {
      clientKey: clientKey,
      task: {
        websiteURL: websiteURL,
        websiteKey: websiteKey,
        type: taskType,
      },
      softID: 33117,
    };
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
      agent: false,
      rejectUnauthorized: false,
    });
    const result = await response.json();
    const taskId = result.taskId;
    if (taskId) {
      return taskId;
    } else {
      console.log(result);
    }
  } catch (error) {
    console.error(error);
  }
}

async function getResponse(taskID) {
  let times = 0;
  while (times < 120) {
    try {
      const url = "https://api.yescaptcha.com/getTaskResult";
      const data = {
        clientKey: clientKey,
        taskId: taskID,
      };
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
        agent: false,
        rejectUnauthorized: false,
      });
      const result = await response.json();
      const solution = result.solution;
      if (solution) {
        const response = solution.token;
        if (response) {
          return response;
        }
      } else {
        //   console.log(result);
      }
    } catch (error) {
      console.error(error);
    }
    times += 3;
    await new Promise((resolve) => setTimeout(resolve, 3000)); // 等待3秒钟
  }
}

(async function main() {
  let keys: string[] = []

  await new Promise<void>((resolve, reject) => {
    fs.readFile("./keys.txt", "utf8", async (err, data) => {
      if (err) {
        console.error("Error reading the file:", err);
        return reject(err);
      }

      keys = data
        .trim()
        .split("\n")
        .map((key) => key.trim());

      resolve()
    });

  });

  for (const key of keys) {
    // 日常任务 (私钥，随机转账地址数组，转账金额基准)
    let retry: number = 0
    while (retry < 5) {

      let success: boolean = false

      try {
        await run(key, keys, 0.00001)
        .then(res => success = true)
        .catch(err => {
          retry++
          success = false
          console.error(`发生异常, 重试${retry}`, err)
        })
  
        if (success) break
      } catch (err) {
        retry++
        success = false
        console.error(`发生异常, 重试${retry}`, err)
      }
      
      if (success) break

    }

    // 抽奖（私钥，抽奖次数）
    // await ringLottery(key, 100)
  }

})()
