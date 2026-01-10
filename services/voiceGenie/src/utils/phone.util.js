export function validateE164(phone) {
  const regex = /^\+[1-9]\d{7,14}$/;
  if (!regex.test(phone)) {
    throw new Error("Phone number must be in E.164 format (+91XXXXXXXXXX)");
  }
}
