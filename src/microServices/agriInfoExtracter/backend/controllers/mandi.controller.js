import { fetchCropPrice } from "../services/agmarknet.service.js";

export const getCropPrice = async (req, res) => {
  try {
    const { state, district, commodity } = req.query;

    if (!state || !district || !commodity) {
      return res.status(400).json({ error: "Missing parameters" });
    }

    const data = await fetchCropPrice({
      state,
      district,
      commodity
    });

    if (!data) {
      return res.status(404).json({ message: "No data found" });
    }

    res.json(data);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Server error" });
  }
};
