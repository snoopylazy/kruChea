
export async function decodeJwt(token) {
    try {
      if (token) {
        const base64Url = token.split(".")[1];
        const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
        const jsonPayload = decodeURIComponent(
          atob(base64)
            .split("")
            .map(function (c) {
              return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
            })
            .join("")
        );
  
        const payload = JSON.parse(jsonPayload);
        const userId = payload.id;
        const username = payload.username;
        const email = payload.email;
        const exp = payload.exp;
  
        return { userId, username, email, exp };
      }
    } catch (error) {
      console.error("Error decoding JWT:", error);
      return null;
    }
  }