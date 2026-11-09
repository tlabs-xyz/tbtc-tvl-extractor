export const DEFAULT_STARKNET_RPC =
  'https://api.cartridge.gg/x/starknet/mainnet'

/** A missing RPC result is an extraction failure, never a measured zero. */
export class StarknetRpc {
  constructor(
    readonly endpoint = process.env.STARKNET_RPC || DEFAULT_STARKNET_RPC,
    private readonly timeout = 10_000,
    private readonly fetcher: typeof fetch = fetch,
  ) {}

  private async request(method: string, params: unknown): Promise<unknown> {
    const response = await this.fetcher(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
      signal: AbortSignal.timeout(this.timeout),
    })
    if (!response.ok) throw new Error(`Starknet RPC HTTP ${response.status}`)

    const data: unknown = await response.json()
    if (
      !data ||
      typeof data !== 'object' ||
      !('result' in data) ||
      ('error' in data && data.error != null)
    ) {
      throw new Error(`Starknet RPC ${method} failed or returned no result`)
    }
    return data.result
  }

  async getBlockNumber(): Promise<number> {
    const result = await this.request('starknet_blockNumber', [])
    if (
      typeof result !== 'number' ||
      !Number.isSafeInteger(result) ||
      result <= 0
    ) {
      throw new Error('Starknet RPC returned an invalid block number')
    }
    return result
  }

  async readUint256(
    contract: string,
    selector: string,
    calldata: string[],
    blockNumber: number,
  ): Promise<bigint> {
    const result = await this.request('starknet_call', {
      request: {
        contract_address: contract,
        entry_point_selector: selector,
        calldata,
      },
      block_id: { block_number: blockNumber },
    })
    if (
      !Array.isArray(result) ||
      result.length !== 2 ||
      result.some(
        (word) =>
          typeof word !== 'string' ||
          !/^0x[0-9a-f]+$/i.test(word) ||
          BigInt(word) >= 1n << 128n,
      )
    ) {
      throw new Error('Starknet RPC returned an invalid uint256')
    }
    return BigInt(result[0]) + (BigInt(result[1]) << 128n)
  }
}

export const BALANCE_OF_SELECTOR =
  '0x02e4263afad30923c891518314c3c95dbe830a16874e8abc5777a9a20b54c76e'
export const TOTAL_ASSETS_SELECTOR =
  '0x21e1f7868a42adf8781cf7d3a76817ceaaafda5d56b7e7d8f26bc4f27ecdbe2'
