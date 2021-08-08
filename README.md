# jupiter-node-sdk

A thin wrapper over the [Jupiter blockchain API](https://jpr.gojupiter.tech/test) with some utility functions to make doing common tasks like fetching data and encrypting/decrypting data easy.

## Install

`$ npm install -s jupiter-node-sdk`

## Usage

```ts
import JupiterClient from 'jupiter-node-sdk'

const client = JupiterClient({
  server: `https://jpr.gojupiter.tech`,
  address: `JUP-XXX-XXX`,
  passphrase: `your secret phrase here`,
  encryptSecret: `optional alphanumeric password to encrypt data going to blockchain`, // DEFAULT: passphrase
})

const jupAmount = client.nqtToJup(stringOfNqtAmount)

const nqtAmount = client.jupToNqt(stringOfJupAmount)

const cipherText = await client.encrypt(
  `plain text to encrypt with AES-256 bit encryption`
)
const plainDecryptedText = await client.decrypt(`cipher text`)

// secretPhrase is basically ERC-20 mnemonic that you can build yourself
const {
  address,
  publicKey,
  requestProcessingTime,
  account,
} = await client.createNewAddress(secretPhrase)

const balanceJup = await client.getBalance(`JUP-XXX-XXX`).balanceNQT

// sender is address in constructor above
await client.sendMoney(recipientJupAddress, amountJupToSend)

// store any data you want (object should be a Javascript object) on the blockchain
await client.storeRecord(object)

// gets all confirmed AND unconfirmed transactions
const txns = await client.getAllTransactions()

// to make any generic Jupiter/NXT API request you can use #request as shown below
// which uses axios under the hood
await client.request('get', '/nxt', {
  params: {
    requestType: 'getBlockchainTransactions',
    account: `JUP-XXX-XXX`,
    withMessage: true,
    type: 1,
  },
})
```
