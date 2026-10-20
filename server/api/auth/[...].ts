import { Auth } from "@auth/core";
import { getAuthOptions } from "../../utils/authOptions";
import {
  GOOGLE_TERMS_COOKIE,
  googleTermsAcceptedAt,
  googleTermsClearCookie,
  googleTermsUseSecureCookie,
} from "../../utils/googleTerms";

export default defineEventHandler(async (event) => {
  const secret = String(useRuntimeConfig().authSecret || "");
  const requestUrl = getRequestURL(event);
  const hadTermsCookie = Boolean(getCookie(event, GOOGLE_TERMS_COOKIE));
  const termsAcceptedAt = googleTermsAcceptedAt(getCookie(event, GOOGLE_TERMS_COOKIE), secret);
  const authOptions = getAuthOptions(termsAcceptedAt);
  const response = await Auth(toWebRequest(event), authOptions);

  if (hadTermsCookie && requestUrl.pathname === "/api/auth/callback/google") {
    response.headers.append(
      "set-cookie",
      googleTermsClearCookie(googleTermsUseSecureCookie(requestUrl.protocol)),
    );
  }

  const setCookieHeader = response.headers.get("set-cookie");
  if (setCookieHeader) {
    event.node.res.setHeader("Set-Cookie", setCookieHeader);
  }

  return response;
});
