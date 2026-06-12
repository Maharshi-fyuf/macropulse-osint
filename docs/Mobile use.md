block-beta
  columns 1
  
  %% Header Area
  block:header:1
    columns 3
    Title["MacroPulse"] space Status["🟢 Live Feed"]
  end
  
  %% Filter Chips Area (Horizontal Scroll)
  block:filters:1
    columns 4
    All["[ All ]"] Energy["[ Energy ]"] Forex["[ Forex ]"] Risk["[ ⚠️ High Risk ]"]
  end
  
  %% Main Feed - Card 1 (High Severity)
  block:card1:1
    columns 1
    block:c1_top:1
      columns 3
      Source["Reuters • 10m ago"] space Badge["🔴 Severity: 9/10"]
    end
    Headline["Strait of Hormuz Blockade Escalates"]
    Rationale["Rationale: 30% of global oil chokepoint threatened. Immediate supply shock expected."]
    block:c1_impact:1
      columns 2
      Bull["▲ Bullish: Brent Crude, XOM"] Bear["▼ Bearish: S&P 500, Airlines"]
    end
  end

  %% Main Feed - Card 2 (Medium Severity)
  block:card2:1
    columns 1
    block:c2_top:1
      columns 3
      Source["Bloomberg • 45m ago"] space Badge["🟡 Severity: 6/10"]
    end
    Headline["ECB Signals Unexpected Rate Cut"]
    Rationale["Rationale: Dovish pivot ahead of schedule. Weakens Euro against dollar."]
    block:c2_impact:1
      columns 2
      Bull["▲ Bullish: DAX, Gold"] Bear["▼ Bearish: EUR/USD"]
    end
  end
  
  %% Bottom Nav / Refresh
  Nav["↓ Pull to Refresh ↓"]