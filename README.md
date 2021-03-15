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

client.nqtToJup(stringOfNqtAmount)

client.jupToNqt(stringOfJupAmount)

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

const balanceJup = await client.getBalance(`JUP-XXX-XXX`)

// sender is address in constructor above
await client.sendMoney(recipientJupAddress)

// store any data you want (object should be a Javascript object) on the blockchain
await client.storeRecord(object)

const txns = await client.getAllTransactions()

// to make any generic Jupiter/NXT API request you can use #request as shown below
// which uses axios under the hood
await this.request('get', '/nxt', {
  params: {
    requestType: 'getBlockchainTransactions',
    account: `JUP-XXX-XXX`,
    withMessage: true,
    type: 1,
  },
})
```

# Tips w/ cryptocurrency

I love FOSS (free and open source software) and for the most part don't want to charge for the software I build. It does however take a good bit of time keeping up with feature requests and bug fixes, so if you have the desire and ability to send me a free coffee, it would be greatly appreciated!

- Bitcoin (BTC): `3D779dP5SZo4szHivWHyFd6J2ESumwDmph`
- Ethereum (ETH and ERC-20 tokens): `0xF3ffa9706b3264EDd1DAa93D5F5D70C8f71fAc99`
- Stellar (XLM): `GACH6YMYFZ574FSGCV7IJXTGETEQL3DLQK64Z6DFGD57PZL5RH6LYOJT`
- Jupiter (JUP) mainnet: `JUP-TUWZ-4B8Z-9REP-2YVH5`
