import React, { useState } from "react";
import axios from "axios";

function App() {
  const [url, setUrl] = useState("");
  const [option, setOption] = useState("followers");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleScrape = async () => {
    setLoading(true);
    setError("");
    setData(null);
    try {
      const response = await axios.post("http://localhost:5000/scrape", {
        url,
        option,
      });
      setData(response.data.data);
    } catch (err) {
      setError(err.response?.data?.error || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <h1 style={{ textAlign: "center" }}>Instagram Data Scraper</h1>

      <div style={{ marginBottom: "20px", textAlign: "center" }}>
        <input
          type="text"
          placeholder="Enter Instagram URL"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          style={{
            width: "300px",
            padding: "10px",
            marginRight: "10px",
            border: "1px solid #ccc",
            borderRadius: "5px",
          }}
        />
        <select
          value={option}
          onChange={(e) => setOption(e.target.value)}
          style={{
            padding: "10px",
            border: "1px solid #ccc",
            borderRadius: "5px",
            marginRight: "10px",
          }}
        >
          <option value="followers">Followers</option>
         
          <option value="comments">Comments</option>
          <option value="likes">Likes</option>
        </select>
        <button
          onClick={handleScrape}
          disabled={loading}
          style={{
            padding: "10px 20px",
            backgroundColor: "#007BFF",
            color: "#fff",
            border: "none",
            borderRadius: "5px",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Scraping..." : "Scrape"}
        </button>
      </div>

      {error && <p style={{ color: "red", textAlign: "center" }}>{error}</p>}

      {data && (
        <div style={{ textAlign: "center", marginTop: "20px", color: "red"}}>
          <h2>Scraped Data:</h2>
          <div
            style={{
              maxHeight: "400px",
              overflowY: "auto",
              margin: "0 auto",
              width: "50%",
              border: "1px solid #ddd",
              borderRadius: "5px",
              padding: "10px",
              textAlign: "left",
              backgroundColor: "#f9f9f9",
            }}
          >
            {
  data.length > 0 ? (
    <ul style={{ listStyleType: "none", padding: 0 }}>
      {Array.from(new Set(data))
        .filter((item) => {
          // Filter out unwanted keywords
          const unwantedKeywords = ["legal", "explore", "web", "accounts", "reels", "direct"];
          return !unwantedKeywords.includes(item);
        })
        .map((item, index) => (
          <li
            key={index}
            style={{
              padding: "10px",
              borderBottom: "1px solid #ddd",
            }}
          >
            <strong>{index + 1}.</strong> {item}
          </li>
        ))}
    </ul>
  )  : (
              <p style={{ color: "red" }}>No data found.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
