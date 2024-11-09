// src/App.js
import React, { useState } from "react";
import "./App.css";

function App() {
  const [domain, setDomain] = useState("");
  const [domains, setDomains] = useState([]);

  const handleRemoveDomain = (domainToRemove) => {
    setDomains(domains.filter((d) => d !== domainToRemove));
  };

  const handleAddDomain = () => {
    if (domain) {
      window.electron.send("block-domain", domain);
      setDomains([...domains, domain]);
      setDomain("");
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>React Electron Firewall</h1>
        <input
          type="text"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          placeholder="Enter domain to block"
        />
        <button onClick={handleAddDomain}>Add Domain</button>
        <ul>
          {domains.map((d, index) => (
            <li key={index}>
              {d}
              <button onClick={() => handleRemoveDomain(d)}>Eliminar</button>
            </li>
          ))}
        </ul>
      </header>
    </div>
  );
}

export default App;
