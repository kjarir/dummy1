import axios from "axios";

const BASE_URL = "https://api.data.gov.in/resource";
const API_KEY = process.env.DATA_GOV_API_KEY;
const RESOURCE_ID = process.env.DATA_GOV_RESOURCE_ID;

export const fetchCropPrice = async ({
  state,
  district,
  commodity
}) => {
  const url =
    `${BASE_URL}/${RESOURCE_ID}?` +
    `api-key=${API_KEY}&format=json&limit=1` +
    `&filters[state]=${state}` +
    `&filters[district]=${district}` +
    `&filters[commodity]=${commodity}` +
    `&sort[Arrival_Date]=desc`;

  console.log("Calling Data.gov API:", url);

  const res = await axios.get(url);

  if (
    !res.data ||
    !Array.isArray(res.data.records) ||
    res.data.records.length === 0
  ) {
    return null;
  }

  const r = res.data.records[0];

  return {
    state: r.State,
    district: r.District,
    market: r.Market,
    commodity: r.Commodity,
    modalPrice: r.Modal_Price,
    minPrice: r.Min_Price,
    maxPrice: r.Max_Price,
    date: r.Arrival_Date
  };
};