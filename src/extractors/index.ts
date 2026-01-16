import { BaseExtractor } from './base.js'
import { AaveExtractor } from './aave/index.js'
import { UniswapExtractor } from './uniswap/index.js'
import { CurveExtractor } from './curve/index.js'
import { CompoundExtractor } from './compound/index.js'
import { SparkExtractor } from './spark/index.js'
import { AerodromeExtractor } from './aerodrome/index.js'
import { VelodromeExtractor } from './velodrome/index.js'
import { YieldBasisExtractor } from './yield-basis/index.js'
import { VesuExtractor } from './vesu/index.js'
import { BucketExtractor } from './bucket/index.js'
import { GearboxExtractor } from './gearbox/index.js'
import { EndurExtractor } from './endur/index.js'
import { EkuboExtractor } from './ekubo/index.js'
import { AlphaLendExtractor } from './alphalend/index.js'
import { EmberExtractor } from './ember/index.js'
import { Chain, ExtractorOptions } from '../types/index.js'
import { Logger } from '../utils/index.js'

export * from './base.js'

export function createExtractors(
  logger: Logger,
  options: ExtractorOptions = {}
): BaseExtractor[] {
  return [
    new AaveExtractor(logger, options),
    new UniswapExtractor(logger, options),
    new CurveExtractor(logger, options),
    new CompoundExtractor(logger, options),
    new SparkExtractor(logger, options),
    new AerodromeExtractor(logger, options),
    new VelodromeExtractor(logger, options),
    new YieldBasisExtractor(logger, options),
    new VesuExtractor(logger, options),
    new BucketExtractor(logger, options),
    new GearboxExtractor(logger, options),
    new EndurExtractor(logger, options),
    new EkuboExtractor(logger, options),
    new AlphaLendExtractor(logger, options),
    new EmberExtractor(logger, options)
  ]
}

export function getExtractorsForProtocol(
  protocolName: string,
  extractors: BaseExtractor[]
): BaseExtractor | undefined {
  return extractors.find(e => e.protocolName === protocolName)
}

export function getExtractorsForChain(
  chain: Chain,
  extractors: BaseExtractor[]
): BaseExtractor[] {
  return extractors.filter(e => e.canExtract(chain))
}
