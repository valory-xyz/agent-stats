# Agent Stats
Get reports on activity on various Olas staking contracts.

<img width="632" alt="image" src="https://github.com/user-attachments/assets/6fe1c850-0a9a-4806-9afd-5be8ff4f73fe">

## Development

### Prerequisites
- The standard versions of Node.js along with Yarn are required to proceed further (confirmed to work with Yarn `1.22.19` and npx/npm `10.1.0` and node `v18.17.0`).

### Install the dependencies
Simply run the following command to install the project:
```
yarn install
```

### See report
```
cd scripts
node run-reports.js
```

### Add more contracts

Add a new object to `reports` array in `scripts/run-reports.js`.
