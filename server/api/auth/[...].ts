import { Auth } from "@auth/core";
import { getAuthOptions } from "../../utils/authOptions";

export default defineEventHandler(async (event) => {
  const authOptions = getAuthOptions();
  const response = await Auth(toWebRequest(event), authOptions);

  const setCookieHeader = response.headers.get("set-cookie");
  if (setCookieHeader) {
    event.node.res.setHeader("Set-Cookie", setCookieHeader);
  }

  return response;
});
