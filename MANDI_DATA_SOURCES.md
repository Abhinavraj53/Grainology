# Mandi Data Sources for Grainology

This document outlines various sources where you can get mandi (agricultural market) price data for India.

## Current Implementation

Your application currently:
- Has a `mandi_prices` table in Supabase/Database
- Has a `MandiBhaav` component that displays prices
- Supports CSV upload for manual data entry
- Has a backend route at `/api/mandi` (check `routes/mandi.js`)

## Government Sources (Free)

### 1. **AGMARKNET (Agricultural Marketing Information Network)**
- **URL**: https://agmarknet.gov.in/
- **Description**: Official government portal for mandi prices
- **Data**: Daily prices from all APMCs across India
- **API**: Limited public API, mostly web scraping required
- **Coverage**: All major commodities, all states
- **Update Frequency**: Daily

### 2. **Data.gov.in**
- **URL**: https://data.gov.in/
- **Description**: Open government data portal
- **Data**: Historical and current mandi prices
- **API**: REST API available with registration
- **Coverage**: Comprehensive
- **Update Frequency**: Daily

### 3. **e-NAM (National Agriculture Market)**
- **URL**: https://www.enam.gov.in/
- **Description**: National electronic trading platform
- **Data**: Real-time trading prices from integrated mandis
- **API**: Limited access, may require partnership
- **Coverage**: 1000+ mandis integrated
- **Update Frequency**: Real-time during trading hours

## Third-Party APIs (Paid/Free Tiers)

### 1. **Bhaav API**
- **URL**: https://bhaav.manufacmagnet.com/
- **Description**: Live mandi prices API
- **Pricing**: Freemium model available
- **Coverage**: Thousands of APMCs
- **Commodities**: Wheat, Rice, Cotton, and more
- **Update Frequency**: Daily
- **Integration**: REST API with documentation

### 2. **Finnid Live Prices**
- **URL**: https://www.finnid.in/
- **Description**: Real-time mandi price dashboard
- **Update Frequency**: Every 3 minutes
- **Target**: FPOs and agri-fintech companies
- **Coverage**: Multiple mandis
- **Integration**: May require partnership

### 3. **AgriApp APIs**
- **Description**: Various agri-tech APIs available
- **Coverage**: Market prices, weather, advisory
- **Integration**: REST APIs available

## Web Scraping Sources

### 1. **AGMARKNET Web Scraping**
- Scrape daily prices from https://agmarknet.gov.in/
- Requires parsing HTML tables
- Legal: Public data, but check terms of service

### 2. **State APMC Websites**
- Each state has its own APMC website
- Examples:
  - Punjab: http://punjabmandi.gov.in/
  - Haryana: http://haryanaagri.gov.in/
  - Maharashtra: https://www.msamb.com/
- Can be scraped for state-specific data

## Implementation Options

### Option 1: Web Scraping (Free but requires maintenance)
```javascript
// Example: Scrape AGMARKNET
const scrapeAgmarknet = async (commodity, state) => {
  // Use libraries like Puppeteer or Cheerio
  // Parse HTML tables
  // Store in database
};
```

### Option 2: Third-Party API (Paid but reliable)
```javascript
// Example: Bhaav API integration
const fetchBhaavPrices = async () => {
  const response = await axios.get('https://api.bhaav.com/prices', {
    headers: {
      'Authorization': 'Bearer YOUR_API_KEY'
    },
    params: {
      commodity: 'wheat',
      state: 'Punjab'
    }
  });
  return response.data;
};
```

### Option 3: Manual CSV Upload (Current)
- Users/admins upload CSV files
- Data stored in `mandi_prices` table
- Good for historical data and specific requirements

### Option 4: Scheduled Jobs
```javascript
// Backend cron job to fetch prices daily
// routes/scheduledJobs.js
const cron = require('node-cron');

cron.schedule('0 6 * * *', async () => {
  // Fetch prices from API/scraper at 6 AM daily
  await updateMandiPrices();
});
```

## Recommended Approach

### Phase 1: Manual + API (Immediate)
1. Keep CSV upload functionality
2. Integrate one free/paid API (Bhaav or similar)
3. Create backend endpoint to fetch and store prices

### Phase 2: Automated (Future)
1. Set up scheduled jobs to fetch prices daily
2. Implement web scraping for additional sources
3. Add data validation and deduplication

## Backend Integration Example

```javascript
// routes/mandi.js - Add API integration
const axios = require('axios');
const MandiPrice = require('../models/MandiPrice');

// Fetch prices from external API
router.get('/fetch-prices', async (req, res) => {
  try {
    // Example: Fetch from Bhaav API
    const response = await axios.get('BHAV_API_URL', {
      headers: { 'Authorization': `Bearer ${process.env.BHAV_API_KEY}` }
    });
    
    // Process and save to database
    const prices = response.data.map(price => ({
      state: price.state,
      district: price.district,
      market: price.market,
      commodity: price.commodity,
      min_price: price.min_price,
      max_price: price.max_price,
      modal_price: price.modal_price,
      price_date: new Date()
    }));
    
    await MandiPrice.insertMany(prices);
    res.json({ success: true, count: prices.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

## Environment Variables Needed

```env
# For Bhaav API (example)
BHAV_API_KEY=your_api_key_here
BHAV_API_URL=https://api.bhaav.com/v1/prices

# For AGMARKNET scraping
AGMARKNET_BASE_URL=https://agmarknet.gov.in

# For scheduled jobs
ENABLE_PRICE_SYNC=true
PRICE_SYNC_SCHEDULE=0 6 * * *  # 6 AM daily
```

## Next Steps

1. **Choose a data source**: Start with Bhaav API or AGMARKNET scraping
2. **Get API credentials**: If using paid API, sign up and get API key
3. **Implement backend route**: Add price fetching endpoint
4. **Set up scheduled jobs**: Automate daily price updates
5. **Test and validate**: Ensure data quality and accuracy

## Resources

- AGMARKNET: https://agmarknet.gov.in/
- Data.gov.in: https://data.gov.in/
- e-NAM: https://www.enam.gov.in/
- Bhaav API: https://bhaav.manufacmagnet.com/
- Finnid: https://www.finnid.in/

## Notes

- Always check terms of service before scraping
- Respect rate limits for APIs
- Validate data before storing in database
- Consider data freshness and update frequency
- Some sources may require registration/partnership

