import dotenv from "dotenv";
dotenv.config();

export const env = {
  port: process.env.PORT || 5000,
  voicegenie: {
    token: process.env.VOICEGENIE_TOKEN,
    workspaceId: process.env.VOICEGENIE_WORKSPACE_ID,
    campaignId: process.env.VOICEGENIE_CAMPAIGN_ID,
    mongoUri: process.env.MONGO_URI
  },
};
