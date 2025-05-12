const cors = require('cors');
const express = require('express');
const app = express();

app.use(cors());
app.use(express.json());
const savedStockData = {};




const sampleData = {
    'NVDA_50': [
        {price:666.66595,time:"2025-05-08T04:11:42.465706306Z"},
        {price:212.9439,time:"2025-05-08T04:14:39.465201105Z"},
        {price:163.42203,time:"2025-05-08T04:23:30.465542126Z"},
        {price:231.95296,time:"2025-05-08T04:26:27.4658491Z"},
        {price:124.95156,time:"2025-05-08T04:30:23.465940341Z"},
        {price:459.09558,time:"2025-05-08T04:39:14.464887447Z"},
        {price:998.27924,time:"2025-05-08T04:50:03.464903606Z"}
    ],
    'PYPL_50': [
        {price: 680.59766, time: "2025-05-09T02:04:27.464908465Z" },
        {price: 652.6387, time: "2025-05-09T02:16:15.466525768Z" },
        {price: 42.583908, time: "2025-05-09T02:23:08.465127888Z" }
    ],
    'AAPL_50': [
        {price:999.99999,time:"2025-05-09T02:04:27.464908465Z"},
        {price:652.6387,time:"2025-05-09T02:16:15.466525768Z"},
        {price:42.583908,time:"2025-05-09T02:23:08.465127888Z"}
    ]
};
async function fetchStockData(stockSymbol,timePeriod) {
    const dataKey=stockSymbol+ '_' +timePeriod;  
    if (savedStockData[dataKey]) {
        console.log('Returning saved data for',stockSymbol);
        return savedStockData[dataKey];
    }
    const stockInfo = sampleData[dataKey];
    if (!stockInfo) {
        throw new Error('No sample data found for ' +stockSymbol + ' with ' +timePeriod+ ' minutes');
    }
    savedStockData[dataKey] = stockInfo;
    return stockInfo;
}
function pairStockPrices(firstStock, secondStock) {
    const smallestLength=Math.min(firstStock.length,secondStock.length);
    const firstPrices=[];
    const secondPrices=[];

     
    for (let i=0; i<smallestLength;i++) {
        firstPrices.push(firstStock[i].price);
        secondPrices.push(secondStock[i].price);
    }
    return { firstPrices,secondPrices };
}
function calculateStdDev(prices, mean) {
    if (prices.length===0) return 0;

    let total = 0;
    const count = prices.length;
    for (let i=0;i<count;i++) {
        total+=(prices[i]-mean)*(prices[i]-mean);
    }
    return Math.sqrt(total/(count - 1));  
}
function calculateCov(firstPrices,secondPrices,firstMean,secondMean){
    if (firstPrices.length!==secondPrices.length || firstPrices.length===0) return 0;

    let total = 0;
    const count = firstPrices.length;
    for (let i = 0; i < count; i++) {
        total += (firstPrices[i] - firstMean) * (secondPrices[i] - secondMean);
    }
    return total / (count - 1);  
}
function findAverage(stockPrices){
    if (stockPrices.length===0) return 0;
    let priceSum = 0;
    for (let i = 0; i < stockPrices.length; i++) {
        priceSum += stockPrices[i].price;  
    }
    return priceSum/stockPrices.length;  
}
app.get('/stocks/:symbol', async (req, res) => {
    const stockSymbol = req.params.symbol;  
    const timePeriod = req.query.minutes;  
    const aggregation = req.query.aggregation;  

     
    if (!timePeriod || isNaN(timePeriod)) {
        return res.status(400).json({ error: 'enter valid value for minute' });
    }
    try { 
        const stockPrices = await fetchStockData(stockSymbol, timePeriod);
        const  avgp = findAverage(stockPrices);

        res.json({
            averageStockPrice:  avgp.toFixed(6),  
            priceHistory: stockPrices.map(item => ({
                price: item.price,
                lastUpdatedAt: item.time
            }))
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.get('/stockcorrelation', async (req, res) => {
    const timePeriod = req.query.minutes;
    const symbols = req.query.ticker; 
    if (!timePeriod || isNaN(timePeriod)) {
        return res.status(400).json({ error: 'Please enter a valid number for minutes' });
    }
    if (!symbols || symbols.length !== 2) {
        return res.status(400).json({ error: 'Please provide exactly two stock symbols' });
    }
    const firstSymbol = symbols[0];  
    const secondSymbol = symbols[1];  
    try {   
        const firstStockPrices = await fetchStockData(firstSymbol, timePeriod);
        const secondStockPrices = await fetchStockData(secondSymbol, timePeriod);      
        const firstAvg = findAverage(firstStockPrices);
        const secondAvg = findAverage(secondStockPrices);   
        const { firstPrices, secondPrices } = pairStockPrices(firstStockPrices, secondStockPrices);     
        if (firstPrices.length === 0 || secondPrices.length === 0) {
            return res.status(400).json({ error: 'Not enough data to find correlation' });
        }   
        const covValue = calculateCov(firstPrices, secondPrices, firstAvg, secondAvg);
        const stdDev1 = calculateStdDev(firstPrices, firstAvg);
        const stdDev2 = calculateStdDev(secondPrices, secondAvg);  
        let corrValue = 0;
        if (stdDev1 !== 0 && stdDev2 !== 0) {
            corrValue = covValue / (stdDev1 * stdDev2);
        }   
        res.json({
            correlation: corrValue.toFixed(4),  
            stocks: {
                [firstSymbol]: {
                    averagePrice: firstAvg.toFixed(6),  
                    priceHistory: firstStockPrices.map(item => ({
                        price: item.price,
                        lastUpdatedAt: item.time
                    }))
                },
                [secondSymbol]: {
                    averagePrice: secondAvg.toFixed(6),  
                    priceHistory: secondStockPrices.map(item => ({
                        price: item.price,
                        lastUpdatedAt: item.time
                    }))
                }
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.listen(serverPort, () => {
    console.log('Server running on port', 3000);
});