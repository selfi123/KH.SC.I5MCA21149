const express=require('express');
const cors=require('cors');
const app=express();
const port=3000;
app.use(cors());
app.use(express.json());
const  demoStockInfo = {
    'NVDA-50': [
        {"price":666.66595,"lastUpdatedAt":"2025-05-08T04:11:42.465706306Z"},
        {"price":212.9439, "lastUpdatedAt":"2025-05-08T04:14:39.465201105Z"},
        {"price":163.42203,"lastUpdatedAt":"2025-05-08T04:23:30.465542126Z"},
        {"price":231.95296,"lastUpdatedAt":"2025-05-08T04:26:27.4658491Z" },
        {"price":124.95156,"lastUpdatedAt":"2025-05-08T04:30:23.465940341Z"},
        {"price":459.09558,"lastUpdatedAt":"2025-05-08T04:39:14.464887447Z"},
        {"price":998.27924,"lastUpdatedAt":"2025-05-08T04:50:03.464903606Z"}
    ],
    'PYPL-50': [
        {"price":680.59766,"lastUpdatedAt":"2025-05-09T02:04:27.464908465Z"},
        {"price":652.6387,"lastUpdatedAt":"2025-05-09T02:16:15.466525768Z"},
        {"price":42.583908,"lastUpdatedAt":"2025-05-09T02:23:08.465127888Z"}
    ]
};
const  cachedPrices = {};

async function  retrieveStockData( symbol, minutes) {
    const cacheKey =  symbol + '-' + minutes;   
    if ( cachedPrices[cacheKey]) {
        console.log('Using cached data for',  symbol);
        return  cachedPrices[cacheKey];
    } 
    const data= demoStockInfo[cacheKey];
    if (!data) {
        throw new Error('No mock data available for '+ symbol+' with '+ minutes +' minutes');
    }  
     cachedPrices[cacheKey]=data;
    return data;
}
function  computeStdDeviation(prices, mean) {
    if (prices.length===0) return 0;
    let sum=0;
    const n=prices.length;
    for (let i=0;i<n;i++) {
        sum+=(prices[i]-mean)*(prices[i]-mean);  
    }
    return Math.sqrt(sum/(n-1));  
}
function  calculateCovariance(prices1, prices2, mean1, mean2) {
    if (prices1.length !== prices2.length || prices1.length === 0) return 0;

    let sum = 0;
    const n = prices1.length;  
    for (let i=0; i<n;i++) {
        sum+=(prices1[i]-mean1)*(prices2[i]-mean2);  
    }
    return sum/(n-1);  
}
function  computeMeanPrice(priceLog) {
    if (priceLog.length===0) return 0;

    let total=0;
    for (let i=0;i<priceLog.length;i++) {
        total+=priceLog[i].price;  
    }
    return total/priceLog.length;  
}
function  pairPriceLists(stock1History, stock2History) {
    const minLength = Math.min(stock1History.length, stock2History.length);  
    const stock1Prices = [];
    const stock2Prices = [];  
    for (let i = 0; i < minLength; i++) {
        stock1Prices.push(stock1History[i].price);
        stock2Prices.push(stock2History[i].price);
    }
    return { stock1Prices, stock2Prices };
}
function  computeMeanPrice(priceLog) {
    if (priceLog.length===0) return 0;

    let total=0;
    for (let i=0;i<priceLog.length;i++) {
        total+=priceLog[i].price;  
    }
    return total/priceLog.length;  
}


app.get('/stocks/:symbol',async(req, res) => {
    const  symbol=req.params.symbol;  
    const minutes=req.query.minutes;  
    if (!minutes || isNaN(minutes)) {
        return res.status(400).json({ error: 'Please provide a valid number of minutes' });
    }
    try {
        const  priceLog=await  retrieveStockData( symbol, minutes);
        const  meanPrice=computeMeanPrice( priceLog); 
        res.json({
            averageStockPrice:meanPrice.toFixed(2),  
             priceLog:priceLog
        });
    } catch (error){
        res.status(500).json({ error: error.message });
    }
});
app.get('/stockcorrelation', async (req, res) => {
    const minutes=req.query.minutes;  
    const  symbols=req.query.symbol;  
    if (!minutes || isNaN(minutes)) {
        return res.status(400).json({error:'provide a valid minute value' });
    }
    if (! symbols || symbols.length !== 2) {
        return res.status(400).json({ error:'2 symbols needed'});
    }
    const  symbol1=symbols[0];  
    const  symbol2=symbols[1];  

    try{
        const stock1History=await retrieveStockData( symbol1, minutes);
        const stock2History=await retrieveStockData( symbol2, minutes);
        const stock1Average=computeMeanPrice(stock1History);
        const stock2Average=computeMeanPrice(stock2History);
        const { stock1Prices,stock2Prices }=pairPriceLists(stock1History, stock2History);
        if (stock1Prices.length===0 || stock2Prices.length===0) {
            return res.status(400).json({ error: 'NEEd more data to calculte the score' });
        }
        const covariance =calculateCovariance(stock1Prices,stock2Prices,stock1Average,stock2Average);
        const stdDev1=computeStdDeviation(stock1Prices,stock1Average);
        const stdDev2=computeStdDeviation(stock2Prices,stock2Average);

         
        let relationScore = 0;
        if (stdDev1!==0 && stdDev2!==0){
            relationScore=covariance/(stdDev1*stdDev2);
        }
        res.json({
            relationScore:relationScore.toFixed(4),  
            stocks:{
                [symbol1]:{
                     meanPrice:stock1Average.toFixed(2),
                     priceLog:stock1History
                },
                [symbol2]: {
                     meanPrice:stock2Average.toFixed(2),
                     priceLog:stock2History
                }
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.listen(port, () => {
    console.log('Server is running on port',port);
});