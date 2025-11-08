import React, { useState } from "react";

function App() {
  const [demand, setDemand] = useState("");
  const [season, setSeason] = useState("");
  const [stock, setStock] = useState("");
  const [price, setPrice] = useState(null);

  const predictPrice = async () => {
    const response = await fetch("http://127.0.0.1:5000/predict_price", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ demand, season, stock }),
    });
    const data = await response.json();
    setPrice(data.predicted_price);
  };

  return (
    <div>
      <h1>AI-Powered Pricing</h1>
      <input
        type="number"
        placeholder="Demand"
        onChange={(e) => setDemand(e.target.value)}
      />
      <input
        type="number"
        placeholder="Season"
        onChange={(e) => setSeason(e.target.value)}
      />
      <input
        type="number"
        placeholder="Stock"
        onChange={(e) => setStock(e.target.value)}
      />
      <button onClick={predictPrice}>Predict Price</button>
      {price && <h3>Predicted Price: ${price.toFixed(2)}</h3>}
    </div>
  );
}

export default App;
