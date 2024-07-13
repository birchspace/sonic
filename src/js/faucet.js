const fetch = require("node-fetch")
const fs = require("fs")
const { Keypair } = require("@solana/web3.js")
// const { decode } = require("bs58")
const bs58 = require("bs58")

// clientKey：从账户获取
const clientKey = "";
const websiteKey = "0x4AAAAAAAc6HG1RMG_8EHSC";
const websiteURL = "https://faucet.sonic.game";

const taskType = "TurnstileTaskProxyless";

async function createTask() {
    try {
      const url = "https://api.yescaptcha.com/createTask";
      const data = {
        clientKey: clientKey,
        task: {
          websiteURL: websiteURL,
          websiteKey: websiteKey,
          type: taskType
        }
      };
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data),
        agent: false,
        rejectUnauthorized: false
      });
      const result = await response.json();
      const taskId = result.taskId;
      if (taskId) {
        return taskId;
      } else {
        console.log(result);
      }
    } catch (error) {
      console.log(error);
    }
  }
  async function getResponse(taskID) {
    let times = 0;
    while (times < 120) {
      try {
        const url = "https://api.yescaptcha.com/getTaskResult";
        const data = {
          clientKey: clientKey,
          taskId: taskID
        };
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(data),
          agent: false,
          rejectUnauthorized: false
        });
        const result = await response.json();
        const solution = result.solution;
        if (solution) {
          const response = solution.token;
          if (response) {
            return response;
          }
        } else {
          console.log(result);
        }
      } catch (error) {
        console.log(error);
      }
      times += 3;
      await new Promise(resolve => setTimeout(resolve, 3000)); // 等待3秒钟
    }
  }

  async function claimByFaucet(pubkey) {
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


(async () => {

    let data = fs.readFileSync("../../keys.txt")
    
    const keys = data.toString().trim().split("\n").map((key) => key.trim());

    // console.log(keys)

    for (const key of keys) {
        let kp = Keypair.fromSecretKey(bs58.default.decode(key))
        const taskId = await createTask();
        console.log('创建任务:', taskId);
        if (taskId) {
            const response = await getResponse(taskId);
            console.log('识别结果:', response);
            
            console.log('领水 1 sol, publicKey:', bs58.default.encode(kp.publicKey));
            claimByFaucet(kp.publicKey)
        }
    }
})();