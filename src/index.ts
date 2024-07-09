import fs from "fs"
import bs58 from 'bs58'
import task from 'tasuku'
import Sonic from "./sonic";
import web3 from "@solana/web3.js"

const connection = new web3.Connection(
    "https://devnet.sonic.game", 'finalized'
);

const SOL_LAMPORts = 1000000000;

async function run(key: string, keys: string[], sol: number) {
    const sonic = new Sonic(key, connection)

    const give_next = sol * SOL_LAMPORts

    await sonic.init()

    await task(`${sonic.keypair.publicKey.toString()}`, async ({ setTitle }) => {

        const balance = await sonic.getBalance()

        setTitle(`${sonic.keypair.publicKey.toString()}: balance is ${balance / SOL_LAMPORts} sol`)

        let title = `${sonic.keypair.publicKey.toString()}`

        const user = await sonic.status()

        title = title + ":"

        setTitle(title)

        if (!user.checked) {

            const checkInTx = await sonic.buildCheckInTx()

            const sendcheckInTx = await sonic.sendTx(connection, checkInTx)

            await sonic.checkInHadnle(sendcheckInTx.txid)

            title = title + " " + "checkIn" + " " + "√"
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
                await sonic.claim()
            })

            transactionstask.clear()

            title = title + " " + "transactions" + " " + "√"
            setTitle(title)
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

        await run(key, keys, 0.00001)

        // 抽奖（私钥，抽奖次数）
        await ringLottery(key, 100)
    }
})()
