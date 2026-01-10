import axios from "axios";
import { env } from "../config/env.js";
import { VOICEGENIE_ENDPOINT } from "../config/voicegenie.js";

export async function pushCall({ customerNumber, customerInformation }) {
  const payload = {
    token: env.voicegenie.token,
    workspaceId: env.voicegenie.workspaceId,
    campaignId: env.voicegenie.campaignId,
    customerNumber,
    customerInformation,
  };

  const response = await axios.post(VOICEGENIE_ENDPOINT, payload, {
    headers: { "Content-Type": "application/json" },
  });

  return response.data;
}
