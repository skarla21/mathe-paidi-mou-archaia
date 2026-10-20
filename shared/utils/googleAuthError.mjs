export function googleAuthErrorMessage(code) {
  if (code === "UnverifiedEmail") {
    return "Το email της Google δεν είναι επαληθευμένο"
  }
  if (code === "OAuthCallbackError") {
    return "Η σύνδεση με Google ακυρώθηκε"
  }
  if (code === "TermsRequired") {
    return "Αποδέξου τους όρους χρήσης για να εγγραφείς με Google"
  }
  return "Η σύνδεση με Google δεν ήταν δυνατή"
}

export function takeGoogleAuthError(previous, code) {
  if (!code) return { handled: null, toast: false }
  if (previous === code) return { handled: previous, toast: false }
  return { handled: code, toast: true }
}
