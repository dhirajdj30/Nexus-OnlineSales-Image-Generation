import React from "react";

const ResponsePage = ({ imageData, onReset }) => {
  return (
    <div className="mt-8 p-4 bg-white shadow-lg rounded-lg border-4 border-purple-400">
      <h2 className="text-3xl font-bold mb-4 text-purple-600">Generated Image</h2>
      
      {/* Fixed size image with object-fit to maintain aspect ratio */}
      <div className="flex justify-center items-center mb-4">
        <img
          src={`http://${imageData.creative_url}`}
          alt="Generated Creative"
          className="w-[700px] h-[400px] object-contain rounded-lg border-2 border-purple-300"
        />
      </div>
      
      <div className="text-purple-700">
        <p><strong>Complete Score:</strong> {imageData.scoring.completeScore}</p>
        <p><strong>File Size:</strong> {imageData.metadata.file_size_kb} KB</p>
        <p><strong>Dimensions:</strong> {imageData.metadata.dimensions.width} x {imageData.metadata.dimensions.height}</p>
      </div>
      
      <button
        onClick={onReset}
        className="w-full bg-purple-500 hover:bg-purple-600 text-white font-semibold py-2 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 mt-4"
      >
        Reset
      </button>
    </div>
  );
};

export default ResponsePage;
