const fs = require('fs');
const path = require('path');
const { getReportData, logReportData } = require('./reportUtils');

async function runReports() {
  const reports = [
    { name: 'pearl-beta', address: "0xeF44Fb0842DDeF59D37f85D61A1eF492bbA6135d", useRetry: true },
    { name: 'pearl-beta-2', address: "0x1c2f82413666d2a3fd8bc337b0268e62ddf67434", useRetry: false },
    { name: 'pearl-beta-3', address: "0xbd59ff0522aa773cb6074ce83cd1e4a05a457bc1", useRetry: false },
    { name: 'pearl-beta-4', address: "0x3052451e1eaee78e62e169afdf6288f8791f2918", useRetry: false },
    { name: 'pearl-beta-5', address: "0x4abe376fda28c2f43b84884e5f822ea775dea9f4", useRetry: false },
    { name: 'pearl-beta-mech-marketplace', address: "0xdaf34ec46298b53a3d24cbcb431e84ebd23927da", useRetry: false },
    { name: 'qs-beta-hobbyist', address: "0x389b46c259631acd6a69bde8b6cee218230bae8c", useRetry: false },
    { name: 'qs-beta-hobbyist-2', address: "0x238eb6993b90a978ec6aad7530d6429c949c08da", useRetry: false },
    { name: 'qs-beta-expert', address: "0x5344b7dd311e5d3dddd46a4f71481bd7b05aaa3e", useRetry: false },
    { name: 'qs-beta-expert-2', address: "0xb964e44c126410df341ae04b13ab10a985fe3513", useRetry: false },
    { name: 'qs-beta-expert-3', address: "0x80fad33cadb5f53f9d29f02db97d682e8b101618", useRetry: false },
    { name: 'qs-beta-expert-4', address: "0xad9d891134443b443d7f30013c7e14fe27f2e029", useRetry: false },
    { name: 'qs-beta-expert-5', address: "0xe56df1e563de1b10715cb313d514af350d207212", useRetry: false },
    { name: 'qs-beta-expert-6', address: "0x2546214aee7eea4bee7689c81231017ca231dc93", useRetry: false },
    { name: 'qs-beta-expert-7', address: "0xd7a3c8b975f71030135f1a66e9e23164d54ff455", useRetry: false },
    // { name: 'optimus-alpha', address: "0x5344b7dd311e5d3dddd46a4f71481bd7b05aaa3e", useRetry: false }
  ];

  let totalStakedServices = 0;
  let totalPearlStakedServices = 0;
  const tableData = [];

  for (const report of reports) {
    try {
      const data = await getReportData(report.address, report.useRetry);
      tableData.push({
        Name: report.name,
        Epoch: data.epochCounter,
        Time_Remaining: data.timeRemaining,
        Staked_Services: data.currentNumServices
      });

      totalStakedServices += data.currentNumServices;
      if (report.name.toLowerCase().includes('pearl')) {
        totalPearlStakedServices += data.currentNumServices;
      }
    } catch (error) {
      console.error(`Error executing ${report.name}: ${error}`);
      tableData.push({
        Name: report.name,
        Epoch: 'Error',
        Time_Remaining: 'Error',
        Staked_Services: 'Error'
      });
    }
  }

  // Add total rows to the table
  tableData.push({
    Name: 'Total Staked Services',
    Epoch: '',
    Time_Remaining: '',
    Staked_Services: totalStakedServices
  });
  tableData.push({
    Name: 'Total Pearl Staked Services',
    Epoch: '',
    Time_Remaining: '',
    Staked_Services: totalPearlStakedServices
  });

  // Remove index column and format the table
  console.log('\nStaking Report:');
  console.table(tableData, ['Name', 'Epoch', 'Time_Remaining', 'Staked_Services']);
}

runReports().catch(console.error);
