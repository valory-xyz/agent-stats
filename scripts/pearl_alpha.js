/*global process*/

const { ethers } = require("ethers");

async function main() {
    const gnosisURL = "https://rpc.gnosischain.com";
    const gnosisProvider = new ethers.providers.JsonRpcProvider(gnosisURL);
    const block = await gnosisProvider.getBlock("latest");
    console.log("\nCurrent block number on gnosis: ", block.number);

    const fs = require("fs");
    // StakingProxy address on gnosis
    const stakingTokenProxyAddress = "0xEE9F19b5DF06c7E8Bfc7B28745dcf944C504198A";
    const stakingTokenJSON = "abis/0.8.25/StakingToken.json";
    let contractFromJSON = fs.readFileSync(stakingTokenJSON, "utf8");
    const stakingTokenABI = JSON.parse(contractFromJSON)["abi"];
    const stakingTokenProxy = new ethers.Contract(stakingTokenProxyAddress, stakingTokenABI, gnosisProvider);

    // OLAS address on gnosis
    const olasAddress = "0xcE11e14225575945b8E6Dc0D4F2dD4C570f79d9f";
    const erc20JSON = "abis/misc/ERC20Token.json";
    contractFromJSON = fs.readFileSync(erc20JSON, "utf8");
    const olasABI = JSON.parse(contractFromJSON)["abi"];
    const olas = new ethers.Contract(olasAddress, olasABI, gnosisProvider);

    console.log("\nProxy address:", stakingTokenProxy.address);
    console.log("Implementation version:", await stakingTokenProxy.VERSION());
    console.log("Epoch counter:", Number(await stakingTokenProxy.epochCounter()));
    console.log("\tLast checkpoint:", Number(await stakingTokenProxy.tsCheckpoint()));
    console.log("\tLiveness period:", Number(await stakingTokenProxy.livenessPeriod()));
    console.log("\tTime passed from the last checkpoint:", block.timestamp - Number(await stakingTokenProxy.tsCheckpoint()));

    console.log("\nOLAS balance:", (await olas.balanceOf(stakingTokenProxyAddress)).toString());
    console.log("Available rewards (balance - accounted rewards):", (await stakingTokenProxy.availableRewards()).toString());
    console.log("Activity checker address:", await stakingTokenProxy.activityChecker());

    console.log("\nRewards per second:", (await stakingTokenProxy.rewardsPerSecond()).toString());
    console.log("Max number of services:", Number(await stakingTokenProxy.maxNumServices()));
    console.log("Current number of staked services:", Number((await stakingTokenProxy.getServiceIds()).length));
    console.log("Min staking deposit:", (await stakingTokenProxy.minStakingDeposit()).toString());
    console.log("Min staking duration:", Number(await stakingTokenProxy.minStakingDuration()));
    console.log("Max inactivity duration:", Number(await stakingTokenProxy.maxInactivityDuration()));


    console.log("\nEmission amount:", (await stakingTokenProxy.emissionsAmount()).toString());
    console.log("Time for emissions:", Number(await stakingTokenProxy.timeForEmissions()));
    console.log("Num agent instances:", Number(await stakingTokenProxy.numAgentInstances()));
    console.log("Agent instance threshold:", Number(await stakingTokenProxy.threshold()));
    console.log("Service registry address:", await stakingTokenProxy.serviceRegistry());
    console.log("Service registry token utility address:", await stakingTokenProxy.serviceRegistryTokenUtility());
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });