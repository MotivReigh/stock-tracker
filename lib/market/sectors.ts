/**
 * Sector-strength is computed from sector ETF quotes (one cheap call each)
 * rather than aggregating across thousands of constituents.
 *
 * Order in this list = display order on the dashboard heat panel.
 */
export type SectorEtf = {
  ticker: string;
  name: string;
  /** Pretty sector label matching updraft_universe.sector. */
  label: string;
};

export const SECTOR_ETFS: SectorEtf[] = [
  { ticker: "SOXX", name: "iShares Semiconductor ETF",      label: "Semiconductors" },
  { ticker: "XLK",  name: "Technology Select Sector SPDR",  label: "Technology" },
  { ticker: "XLC",  name: "Communication Services SPDR",    label: "Communication Services" },
  { ticker: "XLY",  name: "Consumer Discretionary SPDR",    label: "Consumer Discretionary" },
  { ticker: "XLP",  name: "Consumer Staples SPDR",          label: "Consumer Staples" },
  { ticker: "XLV",  name: "Health Care SPDR",               label: "Health Care" },
  { ticker: "XLF",  name: "Financial Select SPDR",          label: "Financials" },
  { ticker: "XLI",  name: "Industrial Select SPDR",         label: "Industrials" },
  { ticker: "XLE",  name: "Energy Select SPDR",             label: "Energy" },
  { ticker: "XLB",  name: "Materials Select SPDR",          label: "Materials" },
  { ticker: "XLRE", name: "Real Estate Select SPDR",        label: "Real Estate" },
  { ticker: "XLU",  name: "Utilities Select SPDR",          label: "Utilities" },
];

/** Index ETFs we always show in the top ticker tape. */
export const INDEX_ETFS: SectorEtf[] = [
  { ticker: "SPY", name: "SPDR S&P 500",                label: "S&P 500" },
  { ticker: "QQQ", name: "Invesco QQQ (Nasdaq 100)",    label: "Nasdaq 100" },
  { ticker: "IWM", name: "iShares Russell 2000",        label: "Russell 2000" },
];
