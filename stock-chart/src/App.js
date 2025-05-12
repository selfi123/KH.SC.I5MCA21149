import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';
import { Select, MenuItem } from '@mui/material';

function App() {
  const [stock, setStock] = useState('NVDA');
  const [minuts, setMinuts] = useState('50'); 
  const [stockData, setStockData] = useState(null);
  const [corrData, setCorrData] = useState(null); 
  const stocks = ['NVDA', 'PYPL', 'AAPL']; 
  useEffect(() => {
    fetch(`http://localhost:3001/stocks/${stock}?minutes=${minuts}&aggregation=average`)
      .then(res => res.json())
      .then(data => {
        const chartData = data.priceHistory.map(item => ({
          price: item.price,
          time: new Date(item.lastUpdatedAt).toLocaleTimeString(),
          fullTime: item.lastUpdatedAt
        }));
        setStockData({ ...data, chartData });
      })
      .catch(() => setStockData(null));
  }, [stock, minuts]);

  useEffect(() => {
    const promises = [];
    for (let i = 0; i < stocks.length; i++) {
      for (let j = i + 1; j < stocks.length; j++) {
        promises.push(
          fetch(`http://localhost:3000/stockcorrelation?minutes=${minuts}&ticker=${stocks[i]}&ticker=${stocks[j]}`)
            .then(res => res.json())
            .then(data => ({
              stock1: stocks[i],
              stock2: stocks[j],
              corr: parseFloat(data.correlation),
              stats: data.stocks
            }))
        );
      }
    }
    Promise.all(promises).then(setCorrData).catch(() => setCorrData(null));
  }, [minuts]);
  const heatmapData = stocks.map((stock1, i) =>
    stocks.map((stock2, j) => {
      if (stock1 === stock2) return { x: i, y: j, value: 1 };
      const pair = corrData?.find(
        d => (d.stock1 === stock1 && d.stock2 === stock2) || (d.stock1 === stock2 && d.stock2 === stock1)
      );
      return { x: i, y: j, value: pair ? pair.corr : 0 };
    })
  ).flat();
  const calcStdDev = (prices) => {
    if (!prices || prices.length < 2) return 0;
    const mean = prices.reduce((s, p) => s + p.price, 0) / prices.length;
    const variance = prices.reduce((s, p) => s + Math.pow(p.price - mean, 2), 0) / (prices.length - 1);
    return Math.sqrt(variance).toFixed(2);
  };

  return (
    <div>
      {/* Stock Chart */}
      <h2>Stock Price</h2>
      <Select value={stock} onChange={(e) => setStock(e.target.value)}>
        <MenuItem value="NVDA">NVDA</MenuItem>
        <MenuItem value="PYPL">PYPL</MenuItem>
        <MenuItem value="AAPL">AAPL</MenuItem>
      </Select>
      <Select value={minuts} onChange={(e) => setMinuts(e.target.value)}>
        <MenuItem value="50">50 Minuts</MenuItem>
      </Select>
      {stockData && (
        <div>
          <p>Average: ${stockData.averageStockPrice}</p>
          <LineChart width={300} height={150} data={stockData.chartData}>
            <XAxis dataKey="time" />
            <YAxis />
            <Tooltip formatter={(val, name, props) => [
              `$${val.toFixed(2)}`,
              new Date(props.payload.fullTime).toLocaleString()
            ]} />
            <Line dataKey="price" stroke="#000" />
            <Line dataKey={() => parseFloat(stockData.averageStockPrice)} stroke="red" />
          </LineChart>
        </div>
      )}
      <h2>Corelatoin Heatmap</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 40px)' }}>
        <div></div>
        {stocks.map(s => <div key={s}>{s}</div>)}
        {stocks.map((stock1, i) => (
          <div key={stock1}>
            <div>{stock1}</div>
            {stocks.map((stock2, j) => {
              const cell = heatmapData.find(d => d.x === i && d.y === j);
              const value = cell.value;
              const color = value > 0.5 ? '#f00' : value > 0 ? '#f66' : value < -0.5 ? '#00f' : value < 0 ? '#66f' : '#888';
              return (
                <div
                  key={j}
                  style={{ background: color, width: 40, height: 40, textAlign: 'center' }}
                  onMouseEnter={() => {
                    const stats = corrData.find(d => d.stock1 === stock1 || d.stock2 === stock1)?.stats[stock1];
                    if (stats) alert(`${stock1}\nAvg: $${stats.averagePrice}\nStd: $${calcStdDev(stats.priceHistory)}`);
                  }}
                >
                  {value.toFixed(2)}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <div>
        <p>Corelatoin Legned:</p>
        <div><span style={{ background:'#f00', width:20,height:20,display:'inline-block'}}></span> Strong Pos</div>
        <div><span style={{ background:'#f66', width:20,height:20,display:'inline-block'}}></span> Weak Pos</div>
        <div><span style={{ background:'#888', width:20,height:20,display:'inline-block'}}></span> Neutral</div>
        <div><span style={{ background:'#66f', width:20,height:20,display:'inline-block'}}></span> Weak Neg</div>
        <div><span style={{ background:'#00f', width:20,height:20,display:'inline-block'}}></span> Strong Neg</div>
      </div>
    </div>
  );
}

export default App;