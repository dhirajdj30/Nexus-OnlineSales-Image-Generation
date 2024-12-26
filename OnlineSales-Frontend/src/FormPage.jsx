import React, { useState } from "react";

const FormPage = ({ onSubmit }) => {
  const [formData, setFormData] = useState({
    creative_details: {
      product_name: "",
      tagline: "",
      brand_palette: ["#FFFFFF", "#FFFFFF", "#FFFFFF"],
      dimensions: { width: 0, height: 0 },
      cta_text: "",
      logo_url: "",
      product_image_url: "",
      target_audience: "",
    },
    scoring_criteria: Array(5).fill({ parameter: "", weight: 0 }),
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const keys = name.split(".");
      const updatedData = { ...prev };
      let current = updatedData;

      keys.forEach((key, idx) => {
        if (idx === keys.length - 1) {
          current[key] = value; // Update the final key
        } else {
          current[key] = { ...current[key] }; // Clone each level
          current = current[key];
        }
      });

      return updatedData;
    });
  };

  const handleArrayChange = (index, field, value) => {
    setFormData((prev) => {
      const updatedArray = prev.scoring_criteria.map((item, idx) =>
        idx === index ? { ...item, [field]: value } : { ...item }
      );
      return { ...prev, scoring_criteria: updatedArray };
    });
  };

  const handlePaletteChange = (index, value) => {
    setFormData((prev) => {
      const updatedPalette = [...prev.creative_details.brand_palette];
      updatedPalette[index] = value;
      return {
        ...prev,
        creative_details: { ...prev.creative_details, brand_palette: updatedPalette },
      };
    });
  };

  const validateWeights = () => {
    const totalWeight = formData.scoring_criteria.reduce((sum, criteria) => sum + parseFloat(criteria.weight || 0), 0);
    return totalWeight === 100;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validateWeights()) {
      alert("The total weight of scoring criteria must sum up to 100.");
      return;
    }

    const apiRequest = {
      creative_details: {
        ...formData.creative_details,
        dimensions: {
          width: parseFloat(formData.creative_details.dimensions.width),
          height: parseFloat(formData.creative_details.dimensions.height),
        },
      },
      scoring_criteria: formData.scoring_criteria.map((criteria) => ({
        ...criteria,
        weight: parseFloat(criteria.weight),
      })),
    };

    onSubmit(apiRequest);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white p-10 rounded-lg shadow-2xl max-w-4xl w-full border-4 border-purple-400"
    >
      <h1 className="text-4xl font-bold mb-8 text-purple-600 text-center">OnlineSales ImageCrafter</h1>

      <div className="grid grid-cols-2 gap-6">
        <div className="mb-4">
          <label className="block text-purple-700 font-semibold mb-2">Product Name</label>
          <input
            type="text"
            name="creative_details.product_name"
            value={formData.creative_details.product_name}
            onChange={handleChange}
            className="w-full border-2 border-purple-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div className="mb-4">
          <label className="block text-purple-700 font-semibold mb-2">Tagline</label>
          <input
            type="text"
            name="creative_details.tagline"
            value={formData.creative_details.tagline}
            onChange={handleChange}
            className="w-full border-2 border-purple-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-purple-700 font-semibold mb-2">Brand Palette</label>
        <div className="flex space-x-4">
          {formData.creative_details.brand_palette.map((color, index) => (
            <input
              key={index}
              type="color"
              value={color}
              onChange={(e) => handlePaletteChange(index, e.target.value)}
              className="w-16 h-10 border-2 border-purple-300 rounded-lg"
            />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-4">
        <div>
          <label className="block text-purple-700 font-semibold mb-2">Width</label>
          <input
            type="number"
            name="creative_details.dimensions.width"
            value={formData.creative_details.dimensions.width}
            onChange={handleChange}
            className="w-full border-2 border-purple-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500"
          />
        </div>
        <div>
          <label className="block text-purple-700 font-semibold mb-2">Height</label>
          <input
            type="number"
            name="creative_details.dimensions.height"
            value={formData.creative_details.dimensions.height}
            onChange={handleChange}
            className="w-full border-2 border-purple-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-purple-700 font-semibold mb-2">CTA Text</label>
        <input
          type="text"
          name="creative_details.cta_text"
          value={formData.creative_details.cta_text}
          onChange={handleChange}
          className="w-full border-2 border-purple-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500"
        />
      </div>

      <div className="mb-4">
        <label className="block text-purple-700 font-semibold mb-2">Logo URL</label>
        <input
          type="url"
          name="creative_details.logo_url"
          value={formData.creative_details.logo_url}
          onChange={handleChange}
          className="w-full border-2 border-purple-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500"
        />
      </div>

      <div className="mb-4">
        <label className="block text-purple-700 font-semibold mb-2">Product Image URL</label>
        <input
          type="url"
          name="creative_details.product_image_url"
          value={formData.creative_details.product_image_url}
          onChange={handleChange}
          className="w-full border-2 border-purple-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500"
        />
      </div>

      <div className="mb-6">
        <label className="block text-purple-700 font-semibold mb-2">Target Audience</label>
        <textarea
          name="creative_details.target_audience"
          value={formData.creative_details.target_audience}
          onChange={handleChange}
          className="w-full border-2 border-purple-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500"
        ></textarea>
      </div>

      <h2 className="text-3xl font-bold mb-4 text-purple-600">Scoring Criteria</h2>

      {formData.scoring_criteria.map((criteria, index) => (
        <div className="mb-4" key={index}>
          <label className="block text-purple-700 font-semibold mb-2">Parameter</label>
          <input
            type="text"
            value={criteria.parameter}
            onChange={(e) => handleArrayChange(index, "parameter", e.target.value)}
            className="w-full border-2 border-purple-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500"
          />
          <label className="block text-purple-700 font-semibold mb-2">Weight (%)</label>
          <input
            type="number"
            value={criteria.weight}
            onChange={(e) => handleArrayChange(index, "weight", e.target.value)}
            className="w-full border-2 border-purple-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500"
          />
        </div>
      ))}

      <button
        type="submit"
        className="w-full bg-purple-500 hover:bg-purple-600 text-white font-semibold py-2 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 mt-4"
      >
        Submit
      </button>
    </form>
  );
};

export default FormPage;
