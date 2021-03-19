import assert from 'assert'
import axios, { AxiosResponse } from 'axios'
import BigNumber from 'bignumber.js'
import Encryption from './Encryption'
import { sleep } from './utils'

export default function JupiterClient(opts: IJupiterClientOpts) {
  const encryption = Encryption({
    secret: opts.encryptSecret || opts.passphrase,
  })
  const CONF = {
    feeNQT: opts.feeNQT || 150,
    deadline: opts.deadline || 60,
    minimumFndrAccountBalance: opts.minimumFndrAccountBalance || 50000,
    minimumUserAccountBalance: opts.minimumUserAccountBalance || 100000,
    jupNqtDecimals: opts.jupNqtDecimals || 8,
  }

  function setClient(serverUrl: string = opts.server) {
    return axios.create({
      baseURL: serverUrl,
      headers: {
        'User-Agent': 'jupiter-node-sdk',
      },
    })
  }

  return {
    recordKey: opts.recordKey,

    // export all options data provided in object returned
    ...opts,

    config: CONF,

    client: setClient(opts.server),
    lastClientTest: 0,
    peerList: [{ announcedAddress: opts.server }],

    // balances from the API come back as NQT, which is 1e-8 JUP
    nqtToJup(nqt: string): string {
      return new BigNumber(nqt).div(CONF.jupNqtDecimals).toString()
    },

    jupToNqt(jup: string): string {
      return new BigNumber(jup).times(CONF.jupNqtDecimals).toString()
    },

    decrypt: encryption.decrypt.bind(encryption),
    encrypt: encryption.encrypt.bind(encryption),

    setClient(...args: any[]) {
      return (this.client = setClient(...args))
    },

    async setClientRoundRobin() {
      let peerListCopy = this.peerList.slice()
      while (peerListCopy.length > 0) {
        const [peer] = peerListCopy.splice(
          Math.random() * peerListCopy.length,
          1
        )
        assert(peer, 'peer does not exist')
        const { announcedAddress } = peer
        const isConnected = await this.testConnection(announcedAddress)
        if (isConnected) {
          this.setClient(announcedAddress)
          this.peerList = await this.getPeers()
          this.lastClientTest = Date.now()
          return
        }
      }

      throw new Error(`No more peers to try and connect to`)
    },

    async testConnection(
      singleServerUrl: string,
      reasonableTimeToWaitMs: number = 5e3 // 5 second default
    ): Promise<boolean> {
      return await Promise.race([
        (async () => {
          await sleep(reasonableTimeToWaitMs)
          return false
        })(),
        (async () => {
          try {
            await this.getPeers(`${singleServerUrl}/nxt`)
            return true
          } catch (err) {
            return false
          }
        })(),
      ])
    },

    // we use this for testConnection, so allow passing in other
    // URLs for testing connections
    async getPeers(serverUrl?: string) {
      const {
        data: { peers },
      } = await this.request('get', serverUrl ? serverUrl : '/nxt', {
        params: {
          requestType: 'getPeers',
          includePeerInfo: true,
        },
        dontTest: true,
      })
      return peers
    },

    async getBalance(address: string = opts.address): Promise<string> {
      const {
        data: {
          // unconfirmedBalanceNQT,
          // forgedBalanceNQT,
          balanceNQT,
          // requestProcessingTime
        },
      } = await this.request('get', '/nxt', {
        params: {
          requestType: 'getBalance',
          account: address,
        },
      })
      return this.nqtToJup(balanceNQT)
    },

    async createNewAddress(passphrase: string) {
      return await this.getAddressFromPassphrase(passphrase)
    },

    async getAddressFromPassphrase(passphrase: string) {
      const {
        data: { accountRS: address, publicKey, requestProcessingTime, account },
      } = await this.request('post', '/nxt', {
        params: {
          requestType: 'getAccountId',
          secretPhrase: passphrase,
        },
      })
      return { address, publicKey, requestProcessingTime, account }
    },

    async sendMoney(recipientAddr: string, amountJup?: string) {
      const { data } = await this.request('post', '/nxt', {
        params: {
          requestType: 'sendMoney',
          secretPhrase: opts.passphrase,
          recipient: recipientAddr,
          amountNQT: amountJup
            ? this.jupToNqt(amountJup)
            : CONF.minimumFndrAccountBalance,
          feeNQT: CONF.feeNQT,
          deadline: CONF.deadline,
        },
      })
      if (
        data.signatureHash === null ||
        (data.errorCode && data.errorCode !== 0)
      ) {
        throw new Error(JSON.stringify(data))
      }
      return data
    },

    // async parseEncryptedRecord(cipherText: string): Promise<IFndrAccount> {
    async parseEncryptedRecord(cipherText: string): Promise<any> {
      return JSON.parse(await this.decrypt(cipherText))
    },

    // async storeRecord(record: IStringMap) {
    async storeRecord(record: any) {
      const finalRecordToStore = this.recordKey
        ? {
            ...record,
            [this.recordKey]: true,
          }
        : record
      const { data } = await this.request('post', '/nxt', {
        params: {
          requestType: 'sendMessage',
          secretPhrase: opts.passphrase,
          recipient: opts.address,
          recipientPublicKey: opts.publicKey,
          messageToEncrypt: await this.encrypt(
            JSON.stringify(finalRecordToStore)
          ),
          feeNQT: CONF.feeNQT,
          deadline: CONF.deadline,
          compressMessageToEncrypt: true,
        },
      })
      if (data.errorCode && data.errorCode !== 0)
        throw new Error(JSON.stringify(data))
      return data
    },

    async decryptRecord(
      message: ITransactionAttachmentDecryptedMessage
    ): Promise<string> {
      const {
        data: { decryptedMessage },
      } = await this.request('get', '/nxt', {
        params: {
          requestType: 'decryptFrom',
          secretPhrase: opts.passphrase,
          account: opts.address,
          data: message.data,
          nonce: message.nonce,
        },
      })
      return decryptedMessage
    },

    async getAllTransactions(
      withMessage: boolean = true,
      type: number = 1
    ): Promise<ITransaction[]> {
      const [confirmed, unconfirmed] = await Promise.all([
        await this.getAllConfirmedTransactions(withMessage, type),
        await this.getAllUnconfirmedTransactions(withMessage, type),
      ])
      return unconfirmed.concat(confirmed)
    },

    async getAllConfirmedTransactions(
      withMessage: boolean = true,
      type: number = 1
    ): Promise<ITransaction[]> {
      const {
        data: {
          /* requestProcessingTime, */
          transactions,
        },
      } = await this.request('get', '/nxt', {
        params: {
          requestType: 'getBlockchainTransactions',
          account: opts.address,
          withMessage,
          type,
        },
      })
      return transactions == null ? [] : transactions
    },

    async getAllUnconfirmedTransactions(
      withMessage: boolean = true,
      type: number = 1
    ): Promise<ITransaction[]> {
      const {
        data: {
          /* requestProcessingTime, */
          unconfirmedTransactions,
        },
      } = await this.request('post', '/nxt', {
        params: {
          requestType: 'getUnconfirmedTransactions',
          account: opts.address,
          withMessage,
          type,
        },
      })

      return unconfirmedTransactions == null
        ? []
        : unconfirmedTransactions.reverse()
    },

    async request(
      verb: 'get' | 'post',
      path: string,
      opts?: IRequestOpts
    ): Promise<AxiosResponse> {
      // test connection every 5 minutes in case the current node dies
      if (
        (!opts || !opts.dontTest) &&
        Date.now() - this.lastClientTest >= 1000 * 60 * 5
      ) {
        assert(
          this.client.defaults.baseURL,
          `current client baseURL is not set for some reason`
        )
        const isConnected = await this.testConnection(
          this.client.defaults.baseURL
        )
        if (!isConnected) {
          await this.setClientRoundRobin()
        }
      }

      switch (verb) {
        case 'post':
          return await this.client.post(
            path,
            undefined, // opts && opts.body
            {
              params: opts && opts.params,
            }
          )

        default:
          // get
          return await this.client.get(path, opts)
      }
    },
  }
}

interface IJupiterClientOpts {
  server: string
  address: string
  passphrase: string
  encryptSecret?: string
  recordKey?: string
  publicKey?: string
  feeNQT?: number
  deadline?: number
  minimumFndrAccountBalance?: number
  minimumUserAccountBalance?: number
  jupNqtDecimals?: number
}

interface IRequestOpts {
  // TODO: according to the NXT docs the only way to pass parameters is
  // via query string params, even if it's a POST. This seems bad, but for
  // now since POST body isn't support don't allow it in a request.
  params?: any
  // body?: any
  dontTest?: boolean
}

interface ITransactionAttachment {
  [key: string]: any
}

interface ITransactionAttachmentDecryptedMessage {
  data: string
  nonce: string
  isText: boolean
  isCompressed: boolean
}

interface ITransaction {
  signature: string
  transactionIndex: number
  type: number
  phased: boolean
  ecBlockId: string
  signatureHash: string
  attachment: ITransactionAttachment
  senderRS: string
  subtype: number
  amountNQT: string
  recipientRS: string
  block: string
  blockTimestamp: number
  deadline: number
  timestamp: number
  height: number
  senderPublicKey: string
  feeNQT: string
  confirmations: number
  fullHash: string
  version: number
  sender: string
  recipient: string
  ecBlockHeight: number
  transaction: string
}
