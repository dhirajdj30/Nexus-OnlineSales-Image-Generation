import React, { useState } from "react";
import FormPage from "./FormPage";
import ResponsePage from "./ResponsePage";

const App = () => {
  const [loading, setLoading] = useState(false);
  const [imageData, setImageData] = useState(null);
  const handleSubmit = async (data) => {
    setLoading(true);
  
    try {
      const response = await fetch("http://ethixlucifer.eastus2.cloudapp.azure.com:3000/evaluate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
  
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
  
      const dataResponse = await response.json();
      setImageData(dataResponse);
    } catch (error) {
      console.error("There was a problem with the fetch operation:", error);
    } finally {
      setLoading(false);
    }
  };
  

  const handleReset = () => {
    setImageData(null);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      {loading && (
        <div className="fixed inset-0 flex items-center justify-center bg-white bg-opacity-75 z-50">
          <div className="loader"></div>
        </div>
      )}
      {!imageData ? (
        <FormPage onSubmit={handleSubmit} />
      ) : (
        <ResponsePage imageData={imageData} onReset={handleReset} />
      )}
    </div>
  );
};

export default App;
